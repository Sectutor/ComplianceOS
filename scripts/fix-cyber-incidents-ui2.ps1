$f = 'D:\OneDrive - Intellfence\WebDev\ComplianceOS\packages\core\src\pages\cyber\CyberIncidentsPage.tsx'
$encoding = [System.Text.Encoding]::UTF8
$c = [System.IO.File]::ReadAllText($f, $encoding)

# Fix severity badges - use semantic tokens instead of raw colors
$c = $c.Replace(
    "incident.severity === 'critical' ? \"bg-red-500 text-white\" :",
    "incident.severity === 'critical' ? \"bg-destructive text-destructive-foreground\" :"
)
$c = $c.Replace(
    "incident.severity === 'high' ? \"bg-orange-500 text-white\" :",
    "incident.severity === 'high' ? \"bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20\" :"
)
$c = $c.Replace(
    "incident.severity === 'medium' ? \"bg-amber-500 text-white\" : \"bg-sky-500 text-white\"",
    "incident.severity === 'medium' ? \"bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20\" : \"bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20\""
)

# Fix significant badge
$c = $c.Replace(
    'bg-red-50 text-destructive border-red-100 font-bold px-2 py-0 text-[10px] uppercase',
    'bg-destructive/10 text-destructive border-destructive/20 font-bold px-2 py-0 text-[10px] uppercase'
)

# Fix brand color reference
$c = $c.Replace('text-brand/60', 'text-muted-foreground')

[System.IO.File]::WriteAllText($f, $c, $encoding)
Write-Output "CyberIncidentsPage.tsx additional UI fixes applied"
