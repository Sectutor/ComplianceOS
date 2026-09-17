Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(30)

$clients = @(15, 16, 17)
$clientNames = @("FDSA (Federal)", "EuroCloud (EU)", "NexGen AI")

for ($i = 0; $i -lt $clients.Count; $i++) {
    $cid = $clients[$i]
    $name = $clientNames[$i]
    Write-Output "`n=== Client $cid : $name ==="
    
    # Gap Analyses
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/gapAnalysis.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "  Gap Analyses: $($items.Count)"
        foreach ($item in $items) {
            Write-Output "    - $($item.name) [$($item.framework)]"
        }
    } catch {
        Write-Output "  Gap Analyses: ERROR"
    }
    
    # Risks
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/risks.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        Write-Output "  Risks: $($items.Count)"
    } catch {
        Write-Output "  Risks: ERROR"
    }
    
    # Policies
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/clientPolicies.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "  Policies: $($items.Count)"
    } catch {
        Write-Output "  Policies: ERROR"
    }
    
    # Business Processes
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/businessContinuity.processes.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        Write-Output "  Business Processes: $($items.Count)"
    } catch {
        Write-Output "  Business Processes: ERROR"
    }
    
    # Vendors (client-specific)
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/globalVendors.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        $clientVendors = ($items | Where-Object { $_.clientId -eq $cid }).Count
        Write-Output "  Vendors: $clientVendors"
    } catch {
        Write-Output "  Vendors: ERROR"
    }
    
    # Audits
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/audit.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        Write-Output "  Audits: $($items.Count)"
    } catch {
        Write-Output "  Audits: ERROR"
    }
}
