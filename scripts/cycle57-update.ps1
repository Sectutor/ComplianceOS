$f = 'CHANGELOG.md'
$c = Get-Content $f -Raw

$newEntry = @"
### Cycle 58 — Verification: stable state confirmed, no regressions (2026-08-28)
- verify: vitest 2802/2802 across 114 files, all green.
- verify: tsc check 0 errors (tsconfig.check.json + ui/tsconfig.json).
- verify: smoke green (Phase 2 ready); no regressions detected.

"@

$c = $c -replace '(## Unreleased)\r\n', "`$1`r`n$newEntry"

Set-Content $f $c
Write-Output "CHANGELOG.md updated"
