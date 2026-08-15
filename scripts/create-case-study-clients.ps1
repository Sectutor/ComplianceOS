# Create 6 Clients for Case Study Scenarios
$baseUri = "http://127.0.0.1:3002/api/trpc"
$httpClient = New-Object System.Net.Http.HttpClient()

function Invoke-TrpcMutation {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $url = [string]$baseUri + "/" + [string]$Path + "?batch=1"
    $content = New-Object System.Net.Http.StringContent($batchInput, [System.Text.Encoding]::UTF8, "application/json")
    $response = $httpClient.PostAsync($url, $content).Result
    $body = $response.Content.ReadAsStringAsync().Result
    return @{ StatusCode = [int]$response.StatusCode; Body = $body; IsSuccess = $response.IsSuccessStatusCode }
}

function New-Client {
    param(
        [string]$Name,
        [string]$Industry,
        [string]$Size,
        [string]$Description,
        [string[]]$Frameworks
    )
    
    Write-Host "Creating client: $Name..." -ForegroundColor Cyan
    
    $payload = @{
        name = $Name
        industry = $Industry
        size = $Size
        description = $Description
        frameworks = $Frameworks
    }
    
    $result = Invoke-TrpcMutation -Path "clients.create" -Data $payload
    
    if ($result.IsSuccess) {
        try {
            $parsed = $result.Body | ConvertFrom-Json
            $clientId = $parsed.result.data.json.id
            Write-Host "  Created $Name (ID: $clientId)" -ForegroundColor Green
            return $clientId
        } catch {
            Write-Host "  Response: $($result.Body)" -ForegroundColor Yellow
            return $null
        }
    } else {
        Write-Host "  Failed (HTTP $($result.StatusCode)): $($result.Body)" -ForegroundColor Red
        return $null
    }
}

Write-Host "========================================"
Write-Host "Creating 6 Clients for Case Studies"
Write-Host "========================================"

$medCareId = New-Client -Name "MedCare" -Industry "Healthcare" -Size "500-1000" -Description "Regional healthcare provider managing patient data across 12 clinics" -Frameworks @("ISO27001")
$shopSphereId = New-Client -Name "ShopSphere Ltd." -Industry "Retail" -Size "200-500" -Description "E-commerce platform processing 50K transactions daily" -Frameworks @("ISO22301")
$fastRouteId = New-Client -Name "FastRoute Logistics" -Industry "Transportation" -Size "1000-5000" -Description "Global logistics provider with 200+ distribution centers" -Frameworks @("ISO22301")
$metroBankId = New-Client -Name "MetroBank Financial" -Industry "Banking" -Size "5000+" -Description "Regional bank serving 2M customers with digital-first approach" -Frameworks @("ISO27001", "SOC2")
$cyberShieldId = New-Client -Name "CyberShield Security" -Industry "Technology" -Size "50-200" -Description "Cybersecurity firm providing managed security services" -Frameworks @("ISO27001", "SOC2")
$industrialTechId = New-Client -Name "IndustrialTech Manufacturing" -Industry "Manufacturing" -Size "1000-5000" -Description "Industrial IoT manufacturer with 15 factories worldwide" -Frameworks @("ISO27001")

Write-Host ""
Write-Host "========================================"
Write-Host "Client Creation Summary"
Write-Host "========================================"
Write-Host "MedCare:              ID $medCareId"
Write-Host "ShopSphere Ltd.:      ID $shopSphereId"
Write-Host "FastRoute Logistics:  ID $fastRouteId"
Write-Host "MetroBank Financial:  ID $metroBankId"
Write-Host "CyberShield Security: ID $cyberShieldId"
Write-Host "IndustrialTech Mfg:  ID $industrialTechId"

$httpClient.Dispose()
