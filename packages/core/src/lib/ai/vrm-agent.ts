
// import { llmService } from '../llm/service';
import { getDb } from '../../db';
import { globalVendors, vendors, vendorChangeLogs } from '../../schema';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import dns from 'dns/promises';

/**
 * Checks if an IP address belongs to private/internal/reserved ranges (SSRF Defense)
 */
export function isPrivateIp(ip: string): boolean {
    const ipv4Parts = ip.split('.').map(Number);
    if (ipv4Parts.length === 4 && ipv4Parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
        const [a, b] = ipv4Parts;
        if (a === 10) return true; // 10.0.0.0/8
        if (a === 127) return true; // 127.0.0.0/8 (loopback)
        if (a === 0) return true; // 0.0.0.0/8
        if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, cloud metadata)
        if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
        if (a === 192 && b === 168) return true; // 192.168.0.0/16
        if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
        return false;
    }

    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) return true;

    return false;
}

/**
 * Validates that an external URL is safe to fetch (SSRF Defense)
 */
export async function isSafeExternalUrl(urlStr: string): Promise<boolean> {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }

        const hostname = parsed.hostname.toLowerCase();
        if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
            return false;
        }

        // Direct private IP literal check
        if (isPrivateIp(hostname)) {
            return false;
        }

        // If hostname is already an IPv4 or IPv6 address, it's public (passed isPrivateIp)
        const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
        if (isIp) {
            return true;
        }

        // DNS resolution check to prevent DNS rebinding / internal network resolution
        try {
            const lookupPromise = dns.lookup(hostname, { all: true });
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('DNS lookup timeout')), 2000)
            );
            const addresses = await Promise.race([lookupPromise, timeoutPromise]);
            for (const addr of addresses) {
                if (isPrivateIp(addr.address)) {
                    return false;
                }
            }
        } catch {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

export interface TrustCenterAnalysis {
    score: number;
    docs: Array<{
        name: string;
        url: string;
        type: string;
        lastReviewed?: string;
    }>;
    gaps: string[];
    riskSummary: string;
    // Advanced Subprocessor Logic
    subprocessors?: Array<{ name: string; purpose: string; location: string }>;
    dpaAnalysis?: {
        liabilityCap?: string;
        auditRights?: string;
        breachNoticeWindow?: string;
    };
}

export class VRMAgentService {
    /**
     * Common patterns for trust center URLs
     */
    private static TRUST_PATTERNS = [
        '/trust',
        '/trust-center',
        '/security',
        '/compliance',
        '/legal/security',
        '/legal/privacy'
    ];

    /**
     * Subdomains common for trust centers
     */
    private static TRUST_SUBDOMAINS = [
        'trust',
        'trustportal',
        'security'
    ];

    /**
     * Check if a URL is reachable
     */
    private async checkUrlAvailability(url: string): Promise<boolean> {
        // SSRF Defense: Validate URL scheme, hostname, and ensure destination IP is not private/loopback/cloud metadata
        const isSafe = await isSafeExternalUrl(url);
        if (!isSafe) {
            console.warn(`[VRM Agent] Blocked potentially unsafe URL (SSRF Defense): ${url}`);
            return false;
        }

        try {
            console.log(`[VRM Agent] Checking availability of: ${url}`);
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(4000)
            });
            if (response.ok) return true;
        } catch (e) {
            // Some servers block HEAD, try GET with a tiny body
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Range': 'bytes=0-100' }, // Just get first 100 bytes
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Discover a vendor's trust center URL
     */
    async discoverTrustCenter(vendorName: string, website?: string): Promise<string | null> {
        console.log(`[VRM Agent] Discovery started for: ${vendorName} (${website || 'no website'})`);

        // 0. Check Global Vendor Database First
        try {
            const db = await getDb();
            const searchPattern = `%${vendorName}%`;
            const globalResult = await db.select()
                .from(globalVendors)
                .where(
                    or(
                        ilike(globalVendors.name, searchPattern),
                        website ? eq(globalVendors.website, website) : sql`false`
                    )
                )
                .limit(1);

            if (globalResult.length > 0 && globalResult[0].trustCenterUrl) {
                console.log(`[VRM Agent] Found "${vendorName}" in Global Database: ${globalResult[0].trustCenterUrl}`);
                return globalResult[0].trustCenterUrl;
            }
        } catch (e) {
            console.error("[VRM Agent] Global database check failed:", e);
        }

        let baseUrl = "";
        let domain = "";

        if (website) {
            baseUrl = website.replace(/\/$/, '');
            if (!baseUrl.startsWith('http')) {
                baseUrl = 'https://' + baseUrl;
            }
            try {
                const urlObj = new URL(baseUrl);
                domain = urlObj.hostname.replace(/^www\./, '');
            } catch (e) {
                // If URL parsing fails, fallback to simple string manipulation
                domain = (website.split('/')[0] || "").replace(/^www\./, '');
            }
        } else {
            // No website provided, try to guess domain from name
            const cleanName = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanName) {
                baseUrl = `https://www.${cleanName}.com`;
                domain = `${cleanName}.com`;
            } else {
                return null;
            }
        }

        const lowName = vendorName.toLowerCase();

        // 1. Major provider heuristics (Always check these first)
        const heuristics: Record<string, string> = {
            'aws': 'https://aws.amazon.com/compliance',
            'amazon web services': 'https://aws.amazon.com/compliance',
            'google': 'https://cloud.google.com/trust-center',
            'microsoft': 'https://www.microsoft.com/en-us/trust-center',
            'azure': 'https://www.microsoft.com/en-us/trust-center',
            'slack': 'https://slack.com/trust',
            'zoom': 'https://zoom.us/trust',
            'stripe': 'https://stripe.com/docs/security',
            'figma': 'https://www.figma.com/security',
            'atlassian': 'https://www.atlassian.com/trust',
            'jira': 'https://www.atlassian.com/trust',
            'supabase': 'https://www.supabase.com/trust',
            'salesforce': 'https://trust.salesforce.com',
            'hubspot': 'https://www.hubspot.com/security',
            'okta': 'https://www.okta.com/trust',
            'auth0': 'https://auth0.com/security',
            'github': 'https://github.com/security',
        };

        for (const [key, val] of Object.entries(heuristics)) {
            if (lowName.includes(key)) {
                if (await this.checkUrlAvailability(val)) return val;
            }
        }

        // 2. Generate candidate URLs
        const candidates: string[] = [];

        // Subdomains
        if (domain) {
            VRMAgentService.TRUST_SUBDOMAINS.forEach(sub => {
                candidates.push(`https://${sub}.${domain}`);
            });
        }

        // Paths
        VRMAgentService.TRUST_PATTERNS.forEach(path => {
            candidates.push(`${baseUrl}${path}`);
        });

        // 3. Test candidates
        console.log(`[VRM Agent] Testing ${candidates.length} candidate URLs for ${vendorName}...`);

        for (const url of candidates) {
            if (await this.checkUrlAvailability(url)) {
                console.log(`[VRM Agent] FOUND reachable trust center: ${url}`);
                return url;
            }
        }

        // Fallback to the most likely pattern if none resolve
        console.log(`[VRM Agent] No candidate URL resolved. Falling back to default pattern.`);
        return `${baseUrl}/trust`;
    }

    /**
     * Analyze a trust center content
     */
    /**
     * Analyze a trust center content
     */
    async analyzeTrustCenter(vendorId: number, url: string): Promise<TrustCenterAnalysis> {
        console.warn("VRM Analysis is a Premium feature.");
        return {
            score: 0,
            docs: [],
            gaps: ["Premium Feature"],
            riskSummary: "This feature is available in the Premium edition."
        };
    }

    /**
     * Detect changes and create logs if necessary
     */
    async detectChanges(vendorId: number): Promise<void> {
        const db = await getDb();
        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId)
        });

        if (!vendor || !vendor.trustCenterUrl) return;

        // SSRF Defense: Validate vendor.trustCenterUrl before making request
        const isSafe = await isSafeExternalUrl(vendor.trustCenterUrl);
        if (!isSafe) {
            console.warn(`[VRM Agent] Blocked change detection for unsafe URL (SSRF Defense): ${vendor.trustCenterUrl}`);
            return;
        }

        try {
            const response = await fetch(vendor.trustCenterUrl, { method: 'HEAD' });
            const lastModified = response.headers.get('last-modified');

            if (lastModified) {
                const newDate = new Date(lastModified);
                const oldDate = vendor.lastTrustCenterChange ? new Date(vendor.lastTrustCenterChange) : null;

                if (!oldDate || newDate.getTime() > oldDate.getTime()) {
                    console.log(`[VRM Agent] Change detected for ${vendor.name}`);

                    // Trigger re-analysis
                    await this.analyzeTrustCenter(vendorId, vendor.trustCenterUrl);

                    // Log change
                    await db.insert(vendorChangeLogs).values({
                        clientId: vendor.clientId,
                        vendorId: vendor.id,
                        changeType: 'trust_center_update',
                        description: 'Detected change in Trust Center headers',
                        oldValue: oldDate ? { lastModified: oldDate } : null,
                        newValue: { lastModified: newDate }
                    });

                    // Update last change timestamp
                    await db.update(vendors)
                        .set({ lastTrustCenterChange: newDate })
                        .where(eq(vendors.id, vendorId));
                }
            }
        } catch (e) {
            console.error(`[VRM Agent] Change detection failed for ${vendor.name}:`, e);
        }
    }
}

export const vrmAgent = new VRMAgentService();
