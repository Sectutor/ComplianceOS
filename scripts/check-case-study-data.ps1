Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(30)

$clients = @(15, 16, 17)

foreach ($cid in $clients) {
    Write-Output "`n=== Client $cid ==="
    
    # Gap Analyses
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/gapAnalysis.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json
        $count = $items.Count
        Write-Output "  Gap Analyses: $count"
        foreach ($item in $items) {
            Write-Output "    - ID $($item.id): $($item.name) [$($item.framework)]"
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
        $count = $items.Count
        Write-Output "  Risks: $count"
        foreach ($item in $items) {
            Write-Output "    - ID $($item.id): $($item.title) [$($item.inherentRisk)]"
        }
    } catch {
        Write-Output "  Risks: ERROR"
    }
    
    # Policies
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/clientPolicies.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        $count = $items.Count
        Write-Output "  Policies: $count"
        foreach ($item in $items) {
            Write-Output "    - ID $($item.id): $($item.name) [$($item.status)]"
        }
    } catch {
        Write-Output "  Policies: ERROR"
    }
    
    # Business Processes
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/businessContinuity.listProcesses?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        $count = $items.Count
        Write-Output "  Business Processes: $count"
        foreach ($item in $items) {
            Write-Output "    - ID $($item.id): $($item.name)"
        }
    } catch {
        Write-Output "  Business Processes: ERROR"
    }
    
    # Vendors
    try {
        $input = [System.Web.HttpUtility]::UrlEncode("{`"clientId`":$cid}")
        $url = "$baseUri/globalVendors.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $json = $body | ConvertFrom-Json
        $items = $json.result.data.json.items
        $count = $items.Count
        Write-Output "  Vendors: $count"
        foreach ($item in $items) {
            Write-Output "    - ID $($item.id): $($item.name)"
        }
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
        $count = $items.Count
        Write-Output "  Audits: $count"
        foreach ($item in $items) {
            Write-Output "    - ID $($item.id): $($item.name) [$($item.type)]"
        }
    } catch {
        Write-Output "  Audits: ERROR"
    }
}
