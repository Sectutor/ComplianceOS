$f = 'D:\OneDrive - Intellfence\WebDev\ComplianceOS\packages\core\src\pages\cyber\CyberIncidentsPage.tsx'
$encoding = [System.Text.Encoding]::UTF8
$c = [System.IO.File]::ReadAllText($f, $encoding)

# Fix 1: getStatusColor - add dark: variants for status pills
$c = $c.Replace(
    'case "resolved": return "bg-green-50 text-green-700 ring-1 ring-green-600/20";',
    'case "resolved": return "bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/20";'
)
$c = $c.Replace(
    'case "mitigated": return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";',
    'case "mitigated": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20";'
)
$c = $c.Replace(
    'case "investigating": return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";',
    'case "investigating": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20";'
)
$c = $c.Replace(
    'default: return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";',
    'default: return "bg-muted text-muted-foreground ring-1 ring-border";'
)

# Fix 2: Card pattern - bg-white -> bg-card, ring-slate-200 -> ring-border, shadow-slate-200 -> shadow-sm
$c = $c.Replace(
    'border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50',
    'border-border shadow-lg rounded-2xl bg-card overflow-hidden ring-1 ring-border'
)

# Fix 3: Button - bg-red-500 -> bg-destructive, text-white -> text-destructive-foreground
$c = $c.Replace(
    'className="bg-red-500 hover:bg-red-600 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95 flex-shrink-0"',
    'className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-12 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex-shrink-0"'
)

# Fix 4: Metric text colors
$c = $c.Replace('text-slate-900', 'text-foreground')
$c = $c.Replace('text-slate-500', 'text-muted-foreground')

# Fix 5: Critical/active text - text-red-600 -> text-destructive
$c = $c.Replace('text-red-600', 'text-destructive')

# Fix 6: Icon containers - bg-sky-50 text-brand-bright -> translucent accent
$c = $c.Replace(
    'h-12 w-12 rounded-xl bg-sky-50 text-brand-bright flex items-center justify-center',
    'h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center'
)

# Fix 7: Critical icon container
$c = $c.Replace(
    'h-12 w-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center',
    'h-12 w-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center'
)

[System.IO.File]::WriteAllText($f, $c, $encoding)
Write-Output "CyberIncidentsPage.tsx UI-STANDARD fixes applied"
