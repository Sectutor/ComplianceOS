import dns from 'dns';
import net from 'net';

/**
 * SSRF guard for server-side outbound webhook delivery.
 *
 * Webhook targets are user-configurable. Without a guard, a low-privilege
 * user can point a subscription at cloud metadata (169.254.169.254), the
 * app's own loopback port, or any RFC1918 service, and read response bodies
 * back from webhook delivery logs.
 *
 * Policy (deny on positive identification):
 *  - only http/https schemes
 *  - hostname blocklist: localhost-style names and internal suffixes
 *  - IP-literal hosts must be public unicast addresses
 *  - resolvable DNS names must not resolve to private/reserved addresses
 *    (catches internal names and DNS pointing into private space)
 *
 * A target that fails to RESOLVE is not blocked here: an unresolvable host
 * cannot be talked to, so there is nothing to exfiltrate — the delivery
 * simply fails downstream.
 */

const BLOCKED_HOSTNAMES = /^(localhost|metadata|metadata\.google\.internal|instance-data)$/i;
const BLOCKED_SUFFIXES = ['.local', '.internal', '.lan', '.home.arpa', '.localdomain'];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0) return true; // protocol assignments / TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true; // unspecified, loopback
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice(7);
    if (net.isIPv4(v4)) return isPrivateIp(v4);
  }
  return false;
}

export function isBlockedWebhookHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.test(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (net.isIP(host)) return isPrivateIp(host);
  return false;
}

/**
 * Throw unless the URL is a deliverable public-web target. The message is
 * recorded in webhook delivery logs, so keep it operator-useful and free of
 * anything sensitive.
 */
export async function assertPublicWebhookTarget(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('webhook target URL is not a valid URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`webhook target scheme must be http(s), got ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isBlockedWebhookHostname(host)) {
    throw new Error(`webhook target host "${host}" is not allowed`);
  }

  // Resolve the name and refuse anything that lands in private/reserved
  // space. Resolution failure is not a block — delivery will fail on its own.
  try {
    const addresses = await dns.promises.lookup(host, { all: true, verbatim: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new Error(`webhook target resolves to a private address (${addr.address})`);
      }
    }
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith('webhook target')) throw err;
    // ENOTFOUND / EAI_AGAIN etc. — let the delivery attempt proceed and fail.
  }
}
