/**
 * Credential Vault Security — panels (cycle 28)
 * =============================================
 * Read-only "Credential Vault Security" section rendered on
 * Settings → Security (`pages/settings/SecuritySettings.tsx`).
 *
 * UI-STANDARD compliance:
 *  - sec.16.2 graceful degradation: the `credentialVault.*` router is NOT
 *    live yet; this section renders an EmptyState ("Connect the
 *    credentialVault.* API") instead of guessing at endpoints or crashing.
 *  - sec.16.3 no fake data as primary state: the posture checklist below is
 *    static informational copy about how the vault behaves, clearly labeled,
 *    not fabricated metrics.
 *  - sec.2 token purity: token-only colors, dark-mode safe, no raw
 *    slate/gray/white/indigo surface tokens.
 *
 * When the backend lands a `credentialVault.status` procedure, swap the
 * EmptyState for a typed contract layer (`pages/security/credentialVaultApi.ts`)
 * following pages/sso/ssoApi.ts and feed real metrics into the same cards.
 */

import { KeyRound, Lock, EyeOff, RefreshCw, ScrollText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";

const VAULT_POSTURE = [
  {
    icon: Lock,
    title: "Encrypted at rest",
    description:
      "Vault credentials are encrypted before they touch disk; plaintext secrets never appear in backups or exports.",
  },
  {
    icon: EyeOff,
    title: "Masked in every response",
    description:
      "API responses return masked credentials only — collectors receive capability tokens, never the raw secret.",
  },
  {
    icon: RefreshCw,
    title: "Rotation reminders",
    description:
      "Connections track last-rotated timestamps so stale credentials surface before auditors find them.",
  },
  {
    icon: ScrollText,
    title: "Audit-logged access",
    description:
      "Every read/write against the vault is appended to the audit trail with actor, connection and timestamp.",
  },
];

export function CredentialVaultSecuritySection({ clientId }: { clientId: number }) {
  const hasWorkspace = clientId > 0;

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary shrink-0" />
            Credential Vault Security
          </CardTitle>
          <CardDescription>
            How collector credentials are stored, masked, rotated and audited for this workspace.
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs border-border text-muted-foreground bg-muted/40 shrink-0">
          Read-only
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {VAULT_POSTURE.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="p-2 rounded-md bg-background border border-border shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {hasWorkspace ? (
          <div className="mt-4">
            <EmptyState
              icon={KeyRound}
              title="Connect the credentialVault.* API"
              description="Live vault metrics (connection count, rotation age, last access) land here once the credentialVault router is wired."
            />
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground text-center">
            Select a workspace client to scope vault posture to its collector connections.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
