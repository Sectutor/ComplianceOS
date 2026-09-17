$f = 'D:\OneDrive - Intellfence\WebDev\ComplianceOS\plans\pipeline\VANTA-SCORECARD.md'
$encoding = [System.Text.Encoding]::UTF8
$c = [System.IO.File]::ReadAllText($f, $encoding)

$marker = '- **Cycle 52** (0ed5a13): Refactor of the security testing surface'

$newEntry = @"
- **Cycle 60** (8d9ee1e): API-FIRST Phase 1.1 (OpenAPI specification layer) + CyberIncidentsPage token-only polish. DIAGNOSE: vitest 2802/2802 (114 files); tsc 0 errors (core + ui); smoke pass; server-err.log shows known AddonScheduler DB errors (not new). Scorecard table already up to date (all 15 features marked Done). BUILD: created openapi/api-v1.yaml (OpenAPI 3.0.3 spec documenting all 50 REST endpoints with path params, query params, request/response schemas, tags, security scheme) + openapi/schemas.yaml (20+ reusable component schemas: Client, Control, Evidence, Risk, Vendor, Incident, etc.) + openapi/swagger.html (Swagger UI loaded from CDN). Wired /api/docs (serves HTML) and /api/spec (serves raw YAML) endpoints in server_entry.ts using readFileSync. Fixed 7 UI-STANDARD violations in CyberIncidentsPage.tsx (hardcoded slate/red/orange/amber/bg-white/text-slate -> design tokens bg-card/text-foreground/border-border/bg-destructive + dark: variants). QA: +24 tests (11 openapi spec validation + 13 swagger endpoint/file tests). REVIEW: no .env/secrets/out-of-scope paths; BOM removed from touched files. VERIFY: vitest 2826/2826 (116 files), tsc 0 errors, smoke green. Pushed to origin/dev.

"@

if ($c.Contains($marker)) {
    $c = $c.Replace($marker, $newEntry + $marker)
    [System.IO.File]::WriteAllText($f, $c, $encoding)
    Write-Output 'Cycle 60 entry added to scorecard'
} else {
    Write-Output 'ERROR: marker not found'
}
