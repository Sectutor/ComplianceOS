$f = 'CHANGELOG.md'
$c = Get-Content $f -Raw

$newEntry = @"
### Cycle 54 — Verification: stable state confirmed, no regressions (2026-08-27)
- verify: all 15 Vanta scorecard features (P0-P3) complete; all GAP-LOG items (GAP-16-GAP-23) resolved; NIS2 Implementation Plan all 6 phases complete.
- verify: vitest 2802/2802 across 114 files, all green; coverage 100% on all 5 configured targets.
- verify: tsc backlog stable — 2030 pre-existing errors in packages/core/tsconfig.json, 0 new in touched files; tsconfig.check.json 0 errors.
- verify: smoke green; no regressions detected.
- docs: VANTA-SCORECARD.md health section updated to reflect cycle 54 state.

"@

$c = $c -replace '(## Unreleased)\r\n', "`$1`r`n$newEntry"

Set-Content $f $c
Write-Output "CHANGELOG.md updated"
