$f = 'CHANGELOG.md'
$encoding = [System.Text.Encoding]::UTF8
$c = [System.IO.File]::ReadAllText($f, $encoding)

$newEntry = @"
### Cycle 59 - Verification: stable state confirmed, no regressions (2026-08-28)
- verify: vitest 2802/2802 across 114 files, all green.
- verify: tsc check 0 errors (tsconfig.check.json + ui/tsconfig.json).
- verify: smoke green (Phase 2 ready); no regressions detected.

"@

$c = $c -replace "(## Unreleased)`r`n", "`$1`r`n$newEntry"

[System.IO.File]::WriteAllText($f, $c, $encoding)
Write-Output "CHANGELOG.md updated (UTF-8 safe)"
