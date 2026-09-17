Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(30)

function Invoke-TrpcPost {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $url = $baseUri + "/" + $Path + "?batch=1"
    $content = New-Object System.Net.Http.StringContent($batchInput, [System.Text.Encoding]::UTF8, "application/json")
    $resp = $hc.PostAsync($url, $content).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    return @{ Status = $resp.StatusCode; Body = $body; Success = $resp.IsSuccessStatusCode }
}

function Invoke-TrpcGet {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $encoded = [System.Web.HttpUtility]::UrlEncode($jsonData)
    $url = $baseUri + "/" + $Path + "?input=" + $encoded
    $resp = $hc.GetAsync($url).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    return @{ Status = $resp.StatusCode; Body = $body; Success = $resp.IsSuccessStatusCode }
}

$clientId = 9

# Get the SoA
Write-Host "Fetching SoA for client $clientId..."
$soaResult = Invoke-TrpcGet -Path "iso27001.getSoA" -Data @{ clientId = $clientId }
$soaData = $soaResult.Body | ConvertFrom-Json
$soaItems = $soaData.result.data.json

# Get the gap responses
Write-Host "Fetching gap responses..."
$gapResult = Invoke-TrpcGet -Path "gapAnalysis.get" -Data @{ id = 4 }
$gapData = $gapResult.Body | ConvertFrom-Json
$gapResponses = $gapData.result.data.json.responses

# Build a map of controlId -> gap status
$gapMap = @{}
foreach ($resp in $gapResponses) {
    $gapMap[$resp.controlId] = $resp.currentStatus
}

Write-Host "Updating SoA controls based on gap analysis..."

$success = 0
$failed = 0
$skipped = 0

foreach ($item in $soaItems) {
    $clientControlId = $item.clientControl.id
    $controlIdStr = $item.control.controlId
    $currentStatus = $item.clientControl.status
    
    # Determine new status from gap analysis
    if ($gapMap.ContainsKey($controlIdStr)) {
        $gapStatus = $gapMap[$controlIdStr]
        
        switch ($gapStatus) {
            "implemented" { $newStatus = "implemented" }
            "partially_implemented" { $newStatus = "in_progress" }
            "not_implemented" { $newStatus = "not_implemented" }
            "not_applicable" { $newStatus = "not_applicable" }
            default { $newStatus = "not_implemented" }
        }
        
        $body = @{
            clientId = $clientId
            controlId = $clientControlId
            applicability = "applicable"
            status = $newStatus
            justification = "Updated from gap analysis assessment"
        }
        
        $result = Invoke-TrpcPost -Path "iso27001.updateSoA" -Data $body
        
        if ($result.Success) {
            $success++
        } else {
            $failed++
            if ($failed -le 3) {
                Write-Host "FAILED: $controlIdStr - $($result.Body.Substring(0, [Math]::Min(80, $result.Body.Length)))" -ForegroundColor Red
            }
        }
    } else {
        $skipped++
    }
}

Write-Host "`nDone! Updated: $success, Failed: $failed, Skipped (no gap data): $skipped"
