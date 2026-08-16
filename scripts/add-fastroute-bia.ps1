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

$clientId = 11

Write-Host "=== Case Study 5: FastRoute BIA Implementation ===" -ForegroundColor Cyan

# Step 1: Create 12 Business Processes
Write-Host "`nStep 1: Creating 12 Business Processes..." -ForegroundColor Yellow
$processes = @(
    @{ Name = "Route Planning & Optimization"; Department = "Operations"; Tier = "Critical"; RTO = "1 Hour"; RPO = "15 Min" },
    @{ Name = "Fleet Management"; Department = "Logistics"; Tier = "Critical"; RTO = "2 Hours"; RPO = "30 Min" },
    @{ Name = "Package Tracking System"; Department = "IT"; Tier = "Critical"; RTO = "30 Min"; RPO = "5 Min" },
    @{ Name = "Warehouse Operations"; Department = "Logistics"; Tier = "High"; RTO = "4 Hours"; RPO = "1 Hour" },
    @{ Name = "Customer Portal"; Department = "IT"; Tier = "High"; RTO = "2 Hours"; RPO = "30 Min" },
    @{ Name = "Driver Dispatch"; Department = "Operations"; Tier = "Critical"; RTO = "1 Hour"; RPO = "15 Min" },
    @{ Name = "Billing & Invoicing"; Department = "Finance"; Tier = "Medium"; RTO = "8 Hours"; RPO = "4 Hours" },
    @{ Name = "Customs Documentation"; Department = "Compliance"; Tier = "High"; RTO = "4 Hours"; RPO = "2 Hours" },
    @{ Name = "Supplier Coordination"; Department = "Procurement"; Tier = "Medium"; RTO = "24 Hours"; RPO = "8 Hours" },
    @{ Name = "HR & Payroll"; Department = "HR"; Tier = "Low"; RTO = "48 Hours"; RPO = "24 Hours" },
    @{ Name = "Fuel Management"; Department = "Operations"; Tier = "Medium"; RTO = "12 Hours"; RPO = "4 Hours" },
    @{ Name = "Customer Support"; Department = "Support"; Tier = "High"; RTO = "4 Hours"; RPO = "2 Hours" }
)

$processIds = @()
foreach ($proc in $processes) {
    $result = Invoke-TrpcPost -Path "businessContinuity.processes.create" -Data @{
        clientId = $clientId
        name = $proc.Name
        department = $proc.Department
        criticalityTier = $proc.Tier
        rto = $proc.RTO
        rpo = $proc.RPO
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    $processIds += $id
    Write-Host "  Created: $($proc.Name) (ID: $id)" -ForegroundColor Green
}

# Step 2: Create 12 BIA Assessments (one per process)
Write-Host "`nStep 2: Creating 12 BIA Assessments..." -ForegroundColor Yellow
$biaIds = @()
for ($i = 0; $i -lt $processIds.Count; $i++) {
    $result = Invoke-TrpcPost -Path "businessContinuity.generateBiaDraft" -Data @{
        clientId = $clientId
        processId = $processIds[$i]
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    $biaIds += $id
    Write-Host "  BIA for $($processes[$i].Name): ID $id" -ForegroundColor Green
}

# Step 3: Add Impact Assessments for each BIA
Write-Host "`nStep 3: Adding Impact Assessments..." -ForegroundColor Yellow
$timeIntervals = @("0-4 Hours", "4-12 Hours", "12-24 Hours", "24-48 Hours", "48+ Hours")
$impactLevels = @(
    @{ Financial = 3; Operational = 4; Reputation = 2; Legal = 2 },
    @{ Financial = 4; Operational = 5; Reputation = 3; Legal = 3 },
    @{ Financial = 5; Operational = 5; Reputation = 4; Legal = 4 },
    @{ Financial = 5; Operational = 5; Reputation = 5; Legal = 5 },
    @{ Financial = 5; Operational = 5; Reputation = 5; Legal = 5 }
)

for ($i = 0; $i -lt $biaIds.Count; $i++) {
    for ($j = 0; $j -lt $timeIntervals.Count; $j++) {
        $result = Invoke-TrpcPost -Path "businessContinuity.bia.saveImpactAssessment" -Data @{
            biaId = $biaIds[$i]
            timeInterval = $timeIntervals[$j]
            financialRating = $impactLevels[$j].Financial
            operationalRating = $impactLevels[$j].Operational
            reputationRating = $impactLevels[$j].Reputation
            legalRating = $impactLevels[$j].Legal
            notes = "Impact assessment for process: $($processes[$i].Name)"
        }
    }
    Write-Host "  Impact assessments added for BIA $($biaIds[$i])" -ForegroundColor Green
}

# Step 4: Add 7 Dependencies
Write-Host "`nStep 4: Adding 7 Dependencies..." -ForegroundColor Yellow
$dependencies = @(
    @{ ProcessId = $processIds[2]; Type = "IT System"; Name = "GPS Tracking API"; Criticality = "Critical" },
    @{ ProcessId = $processIds[2]; Type = "Cloud Service"; Name = "AWS Infrastructure"; Criticality = "Critical" },
    @{ ProcessId = $processIds[5]; Type = "Third Party"; Name = "Mobile Network Providers"; Criticality = "High" },
    @{ ProcessId = $processIds[3]; Type = "IT System"; Name = "Warehouse Management System"; Criticality = "High" },
    @{ ProcessId = $processIds[7]; Type = "Third Party"; Name = "Customs Gateway API"; Criticality = "High" },
    @{ ProcessId = $processIds[6]; Type = "IT System"; Name = "ERP System"; Criticality = "Medium" },
    @{ ProcessId = $processIds[10]; Type = "Third Party"; Name = "Fuel Card Provider"; Criticality = "Medium" }
)

foreach ($dep in $dependencies) {
    $result = Invoke-TrpcPost -Path "businessContinuity.processes.addDependency" -Data @{
        processId = $dep.ProcessId
        dependencyType = $dep.Type
        dependencyName = $dep.Name
        criticality = $dep.Criticality
        notes = "Identified during BIA process"
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    Write-Host "  Dependency: $($dep.Name) (ID: $id)" -ForegroundColor Green
}

# Step 5: Add Recovery Objectives (6 additional ones)
Write-Host "`nStep 5: Adding Recovery Objectives..." -ForegroundColor Yellow
$recoveryObjectives = @(
    @{ BiaId = $biaIds[0]; Activity = "Partial Route Recovery"; RTO = "30 Minutes"; RPO = "5 Minutes"; Criticality = "Critical" },
    @{ BiaId = $biaIds[1]; Activity = "Fleet Tracking Resumption"; RTO = "1 Hour"; RPO = "15 Minutes"; Criticality = "Critical" },
    @{ BiaId = $biaIds[3]; Activity = "Warehouse Operations Restart"; RTO = "2 Hours"; RPO = "30 Minutes"; Criticality = "High" },
    @{ BiaId = $biaIds[4]; Activity = "Customer Portal Restoration"; RTO = "1 Hour"; RPO = "15 Minutes"; Criticality = "High" },
    @{ BiaId = $biaIds[7]; Activity = "Document Processing Recovery"; RTO = "2 Hours"; RPO = "1 Hour"; Criticality = "High" },
    @{ BiaId = $biaIds[11]; Activity = "Support Ticket System Recovery"; RTO = "2 Hours"; RPO = "1 Hour"; Criticality = "High" }
)

foreach ($ro in $recoveryObjectives) {
    $result = Invoke-TrpcPost -Path "businessContinuity.bia.saveRecoveryObjective" -Data @{
        biaId = $ro.BiaId
        activity = $ro.Activity
        rto = $ro.RTO
        rpo = $ro.RPO
        criticality = $ro.Criticality
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    Write-Host "  Recovery Objective: $($ro.Activity) (ID: $id)" -ForegroundColor Green
}

Write-Host "`n=== Case Study 5 Complete ===" -ForegroundColor Cyan
