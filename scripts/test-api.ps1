# Test tRPC API
$baseUrl = "http://127.0.0.1:3002"

# Test a simple query (risks.list requires clientId; page/limit have defaults)
$input = '{"clientId":9}'
$encodedInput = [System.Web.HttpUtility]::UrlEncode($input)
$url = "$baseUrl/api/trpc/risks.list?input=$encodedInput"

Write-Output "Testing URL: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
    Write-Output "Success!"
    Write-Output ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Output "Error: $($_.Exception.Message)"
    Write-Output "StatusCode: $($_.Exception.Response.StatusCode)"
}
