# Case Study 4: ShopSphere BCP - Step 6: Exercises and Testing
# Run this after the main script to add exercises

Add-Type -AssemblyName System.Net.Http
$httpClient = New-Object System.Net.Http.HttpClient
$httpClient.Timeout = [TimeSpan]::FromSeconds(60)

$baseUri = "http://localhost:3005/api/trpc"
$clientId = 7

function Invoke-TrpcMutation {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $url = [string]$baseUri + "/" + [string]$Path + "?batch=1"
    Write-Output "POST $url"
    $content = New-Object System.Net.Http.StringContent($batchInput, [System.Text.Encoding]::UTF8, "application/json")
    $response = $httpClient.PostAsync($url, $content).Result
    $body = $response.Content.ReadAsStringAsync().Result
    return @{ StatusCode = [int]$response.StatusCode; Body = $body; IsSuccess = $response.IsSuccessStatusCode }
}

Write-Output "=========================================="
Write-Output "CASE STUDY 4: Step 6 - Exercises"
Write-Output "=========================================="
Write-Output ""

# Get plans for client 7
function Invoke-TrpcQuery {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $encodedInput = [Uri]::EscapeDataString($batchInput)
    $url = [string]$baseUri + "/" + [string]$Path + "?input=" + $encodedInput + "&batch=1"
    $response = $httpClient.GetAsync($url).Result
    $body = $response.Content.ReadAsStringAsync().Result
    return @{ StatusCode = [int]$response.StatusCode; Body = $body; IsSuccess = $response.IsSuccessStatusCode }
}

# Get all plans for client 7
$plansData = @{ clientId = $clientId }
$result = Invoke-TrpcQuery -Path "businessContinuity.plans.list" -Data $plansData
Write-Output "Plans Status: $($result.StatusCode)"

if ($result.IsSuccess) {
    $plans = ($result.Body | ConvertFrom-Json).result.data.json
    Write-Output "Found $($plans.Count) plans"
    
    # Create exercises for each plan
    $exercises = @(
        @{ title = "Tabletop 1 - Ransomware"; type = "tabletop"; date = "2026-08-01"; status = "Completed" },
        @{ title = "Tabletop 2 - DDoS"; type = "tabletop"; date = "2026-08-08"; status = "Completed" },
        @{ title = "Simulation 1 - Payment"; type = "simulation"; date = "2026-08-15"; status = "Completed" },
        @{ title = "Full Drill - Cloud"; type = "drill"; date = "2026-08-22"; status = "Completed" },
        @{ title = "Tabletop 3 - Personnel"; type = "tabletop"; date = "2026-08-29"; status = "Completed" }
    )
    
    $exerciseCount = 0
    for ($i = 0; $i -lt $plans.Count -and $i -lt $exercises.Count; $i++) {
        $plan = $plans[$i]
        $ex = $exercises[$i]
        
        $exData = @{
            clientId = $clientId
            planId = $plan.id
            title = $ex.title
            type = $ex.type
            date = $ex.date
            status = $ex.status
            notes = "Exercise conducted for $($plan.title)"
        }
        
        $result = Invoke-TrpcMutation -Path "businessContinuity.exercises.create" -Data $exData
        if ($result.IsSuccess) {
            $exId = ($result.Body | ConvertFrom-Json).result.data.json[0].id
            Write-Output "Created exercise '$($ex.title)' (ID: $exId) for plan '$($plan.title)'"
            $exerciseCount++
        } else {
            Write-Output "Failed to create exercise '$($ex.title)': $($result.Body)"
        }
    }
    
    Write-Output ""
    Write-Output "Created $exerciseCount exercises"
} else {
    Write-Output "Failed to get plans: $($result.Body)"
}

Write-Output ""
Write-Output "Step 6 completed!"