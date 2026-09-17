# Case Study Implementation Script
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
    $url = $baseUri + "/" + $Path + "?input=" + $encoded + "&batch=1"
    $resp = $hc.GetAsync($url).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    return @{ Status = $resp.StatusCode; Body = $body; Success = $resp.IsSuccessStatusCode }
}

Write-Host "Creating Case Study 3: MedCare (ID 9)" -ForegroundColor Cyan

# Step 1: Create Gap Analysis
$r = Invoke-TrpcPost "gapAnalysis.create" @{ clientId = 9; name = "MedCare ISO 27001 Gap Analysis"; framework = "ISO 27001:2022"; scope = "All 12 clinic locations, patient management system, billing system, telemedicine platform" }
Write-Host "Gap Analysis: $($r.Body)"

Write-Host "Done" -ForegroundColor Green
