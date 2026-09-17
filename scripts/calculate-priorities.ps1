# Calculate Priorities for New Gap Analyses
Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3002/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(60)

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

Write-Host "=== Calculating Priorities for New Gap Analyses ===" -ForegroundColor Cyan

# Client 15: FDSA - Gap Analyses 6 (NIST CSF) and 7 (ISO 27001)
Write-Host "`nClient 15 (FDSA):" -ForegroundColor Yellow
$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 6 }
Write-Host "  NIST CSF (ID 6): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Start-Sleep -Milliseconds 500

$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 7 }
Write-Host "  ISO 27001 (ID 7): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Start-Sleep -Milliseconds 500

# Client 16: EuroCloud - Gap Analyses 8 (GDPR), 9 (NIS2), 10 (ISO 27001)
Write-Host "`nClient 16 (EuroCloud):" -ForegroundColor Yellow
$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 8 }
Write-Host "  GDPR (ID 8): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Start-Sleep -Milliseconds 500

$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 9 }
Write-Host "  NIS2 (ID 9): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Start-Sleep -Milliseconds 500

$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 10 }
Write-Host "  ISO 27001 (ID 10): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Start-Sleep -Milliseconds 500

# Client 17: NexGen AI - Gap Analyses 11 (ISO 27001) and 12 (SOC 2)
Write-Host "`nClient 17 (NexGen AI):" -ForegroundColor Yellow
$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 11 }
Write-Host "  ISO 27001 (ID 11): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Start-Sleep -Milliseconds 500

$result = Invoke-TrpcPost "gapAnalysis.calculatePriorities" @{ assessmentId = 12 }
Write-Host "  SOC 2 (ID 12): $($result.Body.Substring(0, [Math]::Min(150, $result.Body.Length)))"

Write-Host "`n=== Priorities Calculation Complete ===" -ForegroundColor Cyan
