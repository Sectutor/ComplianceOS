Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(30)

foreach ($cid in @(15, 16, 17)) {
    Write-Output "`n=== CLIENT $cid ==="
    
    # Gap Analyses
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/gapAnalysis.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "Gap Analyses:"
        foreach ($item in $items) {
            Write-Output "  ID $($item.id): $($item.name) [$($item.framework)]"
        }
    } catch { Write-Output "Gap Analyses: ERROR" }
    
    # Risks
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/risks.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        Write-Output "Risks:"
        foreach ($item in $items) {
            Write-Output "  ID $($item.id): $($item.title)"
        }
    } catch { Write-Output "Risks: ERROR" }
    
    # Policies
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/clientPolicies.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "Policies:"
        foreach ($item in $items) {
            Write-Output "  ID $($item.id): $($item.name)"
        }
    } catch { Write-Output "Policies: ERROR" }
    
    # Business Processes
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/businessContinuity.processes.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "Business Processes:"
        foreach ($item in $items) {
            Write-Output "  ID $($item.id): $($item.name)"
        }
    } catch { Write-Output "Business Processes: ERROR" }
    
    # Vendors
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/vendorAssessments.listVendors?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "Vendors:"
        foreach ($item in $items) {
            Write-Output "  ID $($item.id): $($item.name)"
        }
    } catch { Write-Output "Vendors: ERROR" }
    
    # Audits
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/audit.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "Audits:"
        foreach ($item in $items) {
            Write-Output "  ID $($item.id): $($item.notes)"
        }
    } catch { Write-Output "Audits: ERROR" }
}
