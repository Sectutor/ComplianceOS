Add-Type -AssemblyName System.Net.Http
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

$clientId = 10

Write-Host "=== Case Study 4: ShopSphere BCP Implementation ===" -ForegroundColor Cyan

# Step 1: Create BCP Project
Write-Host "`nStep 1: Creating BCP Project..." -ForegroundColor Yellow
$projectResult = Invoke-TrpcPost -Path "businessContinuity.projects.create" -Data @{
    clientId = $clientId
    title = "ShopSphere Business Continuity Program"
    scope = "E-commerce platform, warehouse operations, customer service, payment processing"
    startDate = "2026-08-01"
    targetDate = "2027-02-01"
}
$projectId = ($projectResult.Body | ConvertFrom-Json).result.data.json.id
Write-Host "BCP Project created: ID $projectId" -ForegroundColor Green

# Step 2: Create 8 Business Processes
Write-Host "`nStep 2: Creating 8 Business Processes..." -ForegroundColor Yellow
$processes = @(
    @{ Name = "Order Processing"; Department = "E-commerce"; Tier = "Critical"; RTO = "2 Hours"; RPO = "15 Minutes" },
    @{ Name = "Payment Processing"; Department = "Finance"; Tier = "Critical"; RTO = "1 Hour"; RPO = "5 Minutes" },
    @{ Name = "Warehouse Operations"; Department = "Logistics"; Tier = "High"; RTO = "4 Hours"; RPO = "1 Hour" },
    @{ Name = "Customer Service"; Department = "Support"; Tier = "High"; RTO = "4 Hours"; RPO = "2 Hours" },
    @{ Name = "Website Hosting"; Department = "IT"; Tier = "Critical"; RTO = "30 Minutes"; RPO = "5 Minutes" },
    @{ Name = "Inventory Management"; Department = "Logistics"; Tier = "Medium"; RTO = "8 Hours"; RPO = "4 Hours" },
    @{ Name = "Supplier Integration"; Department = "Procurement"; Tier = "Medium"; RTO = "24 Hours"; RPO = "8 Hours" },
    @{ Name = "Marketing Campaigns"; Department = "Marketing"; Tier = "Low"; RTO = "48 Hours"; RPO = "24 Hours" }
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

# Step 3: Create 7 Disruptive Scenarios
Write-Host "`nStep 3: Creating 7 Disruptive Scenarios..." -ForegroundColor Yellow
$scenarios = @(
    @{ Title = "Ransomware Attack"; Description = "Ransomware encrypts e-commerce platform and customer database"; Likelihood = "High"; Impact = "Critical"; Mitigation = "Offline backups, incident response plan, cyber insurance" },
    @{ Title = "Cloud Provider Outage"; Description = "AWS region outage takes down website for extended period"; Likelihood = "Medium"; Impact = "High"; Mitigation = "Multi-region deployment, CDN failover, DR site" },
    @{ Title = "Payment Gateway Failure"; Description = "Stripe/PayPal outage prevents order processing"; Likelihood = "Medium"; Impact = "High"; Mitigation = "Multiple payment providers, manual processing fallback" },
    @{ Title = "Warehouse Fire"; Description = "Fire at primary warehouse destroys inventory"; Likelihood = "Low"; Impact = "Critical"; Mitigation = "Distributed warehousing, inventory insurance, supplier agreements" },
    @{ Title = "DDoS Attack"; Description = "Volumetric DDoS attack overwhelms website"; Likelihood = "High"; Impact = "Medium"; Mitigation = "DDoS protection service, CDN, rate limiting" },
    @{ Title = "Key Staff Unavailable"; Description = "Pandemic or incident removes critical team members"; Likelihood = "Medium"; Impact = "Medium"; Mitigation = "Cross-training, documentation, succession planning" },
    @{ Title = "Supply Chain Disruption"; Description = "Major supplier goes out of business"; Likelihood = "Medium"; Impact = "High"; Mitigation = "Dual sourcing, safety stock, supplier monitoring" }
)

$scenarioIds = @()
foreach ($scen in $scenarios) {
    $result = Invoke-TrpcPost -Path "businessContinuity.scenarios.create" -Data @{
        clientId = $clientId
        title = $scen.Title
        description = $scen.Description
        likelihood = $scen.Likelihood
        potentialImpact = $scen.Impact
        mitigationStrategies = $scen.Mitigation
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    $scenarioIds += $id
    Write-Host "  Created: $($scen.Title) (ID: $id)" -ForegroundColor Green
}

# Step 4: Create 5 Strategies
Write-Host "`nStep 4: Creating 5 Strategies..." -ForegroundColor Yellow
$strategies = @(
    @{ Title = "Multi-Region Cloud Deployment"; Description = "Deploy across multiple AWS regions for high availability"; Resources = "Cloud infrastructure team, AWS budget"; Cost = "$50,000/year"; Benefits = "99.99% uptime, automatic failover" },
    @{ Title = "Offline Backup Strategy"; Description = "Maintain air-gapped backups of all critical data"; Resources = "Backup infrastructure, storage costs"; Cost = "$20,000/year"; Benefits = "Ransomware recovery, data protection" },
    @{ Title = "Distributed Warehousing"; Description = "Operate multiple smaller warehouses instead of one large facility"; Resources = "Additional warehouse leases, logistics coordination"; Cost = "$100,000/year"; Benefits = "Reduced single-point-of-failure, faster delivery" },
    @{ Title = "Cross-Training Program"; Description = "Ensure all critical roles have trained backups"; Resources = "Training time, documentation effort"; Cost = "$15,000/year"; Benefits = "Staff resilience, reduced key-person dependency" },
    @{ Title = "Multi-Provider Payment Processing"; Description = "Integrate multiple payment providers for redundancy"; Resources = "Development effort, provider fees"; Cost = "$10,000/year"; Benefits = "Payment continuity, customer experience" }
)

$strategyIds = @()
foreach ($strat in $strategies) {
    $result = Invoke-TrpcPost -Path "businessContinuity.strategies.create" -Data @{
        clientId = $clientId
        title = $strat.Title
        description = $strat.Description
        resourceRequirements = $strat.Resources
        estimatedCost = $strat.Cost
        benefits = $strat.Benefits
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    $strategyIds += $id
    Write-Host "  Created: $($strat.Title) (ID: $id)" -ForegroundColor Green
}

# Step 5: Create 5 BC Plans
Write-Host "`nStep 5: Creating 5 BC Plans..." -ForegroundColor Yellow
$plans = @(
    @{ Title = "IT Disaster Recovery Plan"; Status = "draft"; Strategies = @($strategyIds[0], $strategyIds[1]); Scenarios = @($scenarioIds[0], $scenarioIds[1]) },
    @{ Title = "Warehouse Contingency Plan"; Status = "draft"; Strategies = @($strategyIds[2]); Scenarios = @($scenarioIds[3]) },
    @{ Title = "Cyber Incident Response Plan"; Status = "approved"; Strategies = @($strategyIds[0], $strategyIds[1]); Scenarios = @($scenarioIds[0], $scenarioIds[4]) },
    @{ Title = "Pandemic Response Plan"; Status = "approved"; Strategies = @($strategyIds[3]); Scenarios = @($scenarioIds[5]) },
    @{ Title = "Supply Chain Recovery Plan"; Status = "draft"; Strategies = @($strategyIds[2], $strategyIds[4]); Scenarios = @($scenarioIds[6], $scenarioIds[2]) }
)

$planIds = @()
for ($i = 0; $i -lt $plans.Count; $i++) {
    $plan = $plans[$i]
    $result = Invoke-TrpcPost -Path "businessContinuity.plans.create" -Data @{
        clientId = $clientId
        title = $plan.Title
        status = $plan.Status
        strategyIds = $plan.Strategies
        scenarioIds = $plan.Scenarios
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    $planIds += $id
    Write-Host "  Created: $($plan.Title) (ID: $id)" -ForegroundColor Green
}

# Step 6: Create 5 Exercises
Write-Host "`nStep 6: Creating 5 Exercises..." -ForegroundColor Yellow
$exercises = @(
    @{ PlanId = $planIds[2]; Title = "Ransomware Tabletop Exercise"; Type = "tabletop"; Date = "2026-09-15"; Status = "completed" },
    @{ PlanId = $planIds[3]; Title = "Pandemic Remote Working Drill"; Type = "functional"; Date = "2026-10-01"; Status = "completed" },
    @{ PlanId = $planIds[0]; Title = "DR Site Failover Test"; Type = "functional"; Date = "2026-11-01"; Status = "scheduled" },
    @{ PlanId = $planIds[1]; Title = "Warehouse Evacuation Drill"; Type = "drill"; Date = "2026-12-01"; Status = "scheduled" },
    @{ PlanId = $planIds[4]; Title = "Supplier Switch Simulation"; Type = "tabletop"; Date = "2027-01-15"; Status = "scheduled" }
)

foreach ($ex in $exercises) {
    $result = Invoke-TrpcPost -Path "businessContinuity.exercises.create" -Data @{
        clientId = $clientId
        planId = $ex.PlanId
        title = $ex.Title
        type = $ex.Type
        date = $ex.Date
        status = $ex.Status
    }
    $id = ($result.Body | ConvertFrom-Json).result.data.json.id
    Write-Host "  Created: $($ex.Title) (ID: $id)" -ForegroundColor Green
}

Write-Host "`n=== Case Study 4 Complete ===" -ForegroundColor Cyan
