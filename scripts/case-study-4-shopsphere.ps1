# Case Study 4: ShopSphere BCP Implementation - All 7 Steps
# Client 7 (PayFlow Technologies)

Add-Type -AssemblyName System.Net.Http
$httpClient = New-Object System.Net.Http.HttpClient
$httpClient.Timeout = [TimeSpan]::FromSeconds(60)

$baseUri = "http://localhost:3005/api/trpc"
$clientId = 7
$results = @()

function Invoke-TrpcMutation {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $url = [string]$baseUri + "/" + [string]$Path + "?batch=1"
    Write-Output "POST $url"
    Write-Output "Body: $batchInput"
    $content = New-Object System.Net.Http.StringContent($batchInput, [System.Text.Encoding]::UTF8, "application/json")
    $response = $httpClient.PostAsync($url, $content).Result
    $body = $response.Content.ReadAsStringAsync().Result
    return @{ StatusCode = [int]$response.StatusCode; Body = $body; IsSuccess = $response.IsSuccessStatusCode }
}

function Invoke-TrpcQuery {
    param([string]$Path, [object]$Data)
    $jsonData = $Data | ConvertTo-Json -Compress -Depth 10
    $batchInput = '{"0":{"json":' + $jsonData + '}}'
    $encodedInput = [Uri]::EscapeDataString($batchInput)
    $url = [string]$baseUri + "/" + [string]$Path + "?input=" + $encodedInput + "&batch=1"
    Write-Output "GET $url"
    $response = $httpClient.GetAsync($url).Result
    $body = $response.Content.ReadAsStringAsync().Result
    return @{ StatusCode = [int]$response.StatusCode; Body = $body; IsSuccess = $response.IsSuccessStatusCode }
}

Write-Output "=========================================="
Write-Output "CASE STUDY 4: ShopSphere BCP Implementation"
Write-Output "Client ID: $clientId"
Write-Output "=========================================="
Write-Output ""

# ============================================
# Step 1: Define BCMS Scope and Policy
# ============================================
Write-Output "--- Step 1: Define BCMS Scope and Policy ---"
$programData = @{
    clientId = $clientId
    programName = "ShopSphere BCMS"
    scopeDescription = "E-commerce platform, warehouse operations, customer service, payment processing"
    policyStatement = "ShopSphere is committed to maintaining critical business functions during disruptive incidents. We will identify critical activities, set recovery objectives, document response procedures, and validate our plans through regular testing."
    budgetAllocated = "50000"
    status = "draft"
}
$result = Invoke-TrpcMutation -Path "businessContinuity.program.upsert" -Data $programData
Write-Output "Status: $($result.StatusCode)"
Write-Output "Response: $($result.Body)"
if ($result.IsSuccess) {
    $programId = ($result.Body | ConvertFrom-Json).result.data.json[0].id
    Write-Output "Program ID: $programId"
    $results += "Step 1: BCMS Scope created (ID: $programId)"
} else {
    $results += "Step 1: FAILED - $($result.Body)"
}
Write-Output ""

# ============================================
# Step 2: Business Impact Analysis (BIA) - Create Business Processes
# ============================================
Write-Output "--- Step 2: Business Impact Analysis (BIA) ---"

$processes = @(
    @{ name = "Order processing"; description = "Process customer orders through e-commerce platform"; department = "E-commerce"; criticalityTier = "Critical"; rto = "1 hour"; rpo = "15 minutes" },
    @{ name = "Payment processing"; description = "Process payments via Stripe and PayPal"; department = "Finance"; criticalityTier = "Critical"; rto = "30 minutes"; rpo = "0 minutes" },
    @{ name = "Warehouse fulfillment"; description = "Pick, pack, and ship orders"; department = "Operations"; criticalityTier = "Critical"; rto = "4 hours"; rpo = "1 hour" },
    @{ name = "Customer service"; description = "Handle customer inquiries and complaints"; department = "Support"; criticalityTier = "High"; rto = "1 hour"; rpo = "15 minutes" },
    @{ name = "Website hosting"; description = "Host e-commerce website on AWS"; department = "IT"; criticalityTier = "Critical"; rto = "15 minutes"; rpo = "5 minutes" },
    @{ name = "Inventory management"; description = "Track inventory levels and reorder"; department = "Operations"; criticalityTier = "High"; rto = "4 hours"; rpo = "1 hour" },
    @{ name = "Marketing campaigns"; description = "Run digital marketing campaigns"; department = "Marketing"; criticalityTier = "Low"; rto = "24 hours"; rpo = "4 hours" },
    @{ name = "HR operations"; description = "Manage employee records and payroll"; department = "HR"; criticalityTier = "Low"; rto = "48 hours"; rpo = "24 hours" }
)

$processIds = @()
foreach ($proc in $processes) {
    $procData = @{
        clientId = $clientId
        name = $proc.name
        description = $proc.description
        department = $proc.department
        criticalityTier = $proc.criticalityTier
        rto = $proc.rto
        rpo = $proc.rpo
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.processes.create" -Data $procData
    if ($result.IsSuccess) {
        $procId = ($result.Body | ConvertFrom-Json).result.data.json.id
        $processIds += $procId
        Write-Output "Created process '$($proc.name)' (ID: $procId)"
    } else {
        Write-Output "Failed to create process '$($proc.name)': $($result.Body)"
    }
}
$results += "Step 2: Created $($processIds.Count) business processes"
Write-Output ""

# ============================================
# Step 3: Risk Assessment for BC - Create Disruptive Scenarios
# ============================================
Write-Output "--- Step 3: Risk Assessment for BC ---"

$scenarios = @(
    @{ title = "Ransomware Attack"; description = "Ransomware encrypts critical systems"; likelihood = "High"; potentialImpact = "Critical"; mitigationStrategies = "EDR, backups, incident response plan" },
    @{ title = "DDoS Attack"; description = "DDoS attack overwhelms website"; likelihood = "High"; potentialImpact = "High"; mitigationStrategies = "Cloudflare, auto-scaling" },
    @{ title = "Payment Processor Outage"; description = "Primary payment processor goes down"; likelihood = "Medium"; potentialImpact = "Critical"; mitigationStrategies = "Backup payment processor" },
    @{ title = "Cloud Provider Outage"; description = "AWS region goes down"; likelihood = "Medium"; potentialImpact = "Critical"; mitigationStrategies = "Multi-region deployment" },
    @{ title = "Key Personnel Loss"; description = "Key staff unavailable"; likelihood = "Medium"; potentialImpact = "High"; mitigationStrategies = "Cross-training, documentation" },
    @{ title = "Natural Disaster"; description = "Earthquake, flood, or fire"; likelihood = "Low"; potentialImpact = "Critical"; mitigationStrategies = "Remote work, alternate site" },
    @{ title = "Supply Chain Disruption"; description = "Supplier cannot deliver goods"; likelihood = "Medium"; potentialImpact = "High"; mitigationStrategies = "Multiple suppliers, safety stock" }
)

$scenarioIds = @()
foreach ($scen in $scenarios) {
    $scenData = @{
        clientId = $clientId
        title = $scen.title
        description = $scen.description
        likelihood = $scen.likelihood
        potentialImpact = $scen.potentialImpact
        mitigationStrategies = $scen.mitigationStrategies
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.scenarios.create" -Data $scenData
    if ($result.IsSuccess) {
        $scenId = ($result.Body | ConvertFrom-Json).result.data.json.id
        $scenarioIds += $scenId
        Write-Output "Created scenario '$($scen.title)' (ID: $scenId)"
    } else {
        Write-Output "Failed to create scenario '$($scen.title)': $($result.Body)"
    }
}
$results += "Step 3: Created $($scenarioIds.Count) disruptive scenarios"
Write-Output ""

# ============================================
# Step 4: Define Recovery Strategies with RTO/RPO
# ============================================
Write-Output "--- Step 4: Define Recovery Strategies ---"

$strategies = @(
    @{ title = "Hot Standby - Order Processing"; description = "Failover to secondary region"; resourceRequirements = "Secondary AWS region"; estimatedCost = "15000"; benefits = "RTO 1 hour" },
    @{ title = "Multi-Provider - Payment Processing"; description = "Switch to backup processor"; resourceRequirements = "Backup payment gateway"; estimatedCost = "5000"; benefits = "RTO 30 minutes" },
    @{ title = "Alternate Site - Warehouse"; description = "Secondary warehouse"; resourceRequirements = "Warehouse space"; estimatedCost = "20000"; benefits = "RTO 4 hours" },
    @{ title = "Remote Work - Customer Service"; description = "Cloud-based CRM"; resourceRequirements = "VPN, cloud CRM"; estimatedCost = "3000"; benefits = "RTO 1 hour" },
    @{ title = "Auto-Scaling - Website"; description = "Multi-AZ deployment"; resourceRequirements = "AWS Auto Scaling"; estimatedCost = "8000"; benefits = "RTO 15 minutes" }
)

$strategyIds = @()
foreach ($strat in $strategies) {
    $stratData = @{
        clientId = $clientId
        title = $strat.title
        description = $strat.description
        resourceRequirements = $strat.resourceRequirements
        estimatedCost = $strat.estimatedCost
        benefits = $strat.benefits
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.strategies.create" -Data $stratData
    if ($result.IsSuccess) {
        $stratId = ($result.Body | ConvertFrom-Json).result.data.json[0].id
        $strategyIds += $stratId
        Write-Output "Created strategy '$($strat.title)' (ID: $stratId)"
    } else {
        Write-Output "Failed to create strategy '$($strat.title)': $($result.Body)"
    }
}
$results += "Step 4: Created $($strategyIds.Count) recovery strategies"
Write-Output ""

# ============================================
# Step 5: Document Business Continuity Plans
# ============================================
Write-Output "--- Step 5: Document Business Continuity Plans ---"

# Get BIA records for the processes
$biaData = @{ clientId = $clientId }
$result = Invoke-TrpcQuery -Path "businessContinuity.bia.list" -Data $biaData
Write-Output "BIA List Status: $($result.StatusCode)"
Write-Output "BIA List Response: $($result.Body)"

if ($result.IsSuccess) {
    $bias = ($result.Body | ConvertFrom-Json).result.data.json
    Write-Output "Found $($bias.Count) BIAs"
} else {
    $bias = @()
    Write-Output "No BIAs found or error occurred"
}

# Create BC Plans
$plans = @(
    @{ title = "Ransomware Attack Response Plan"; description = "Response plan for ransomware attacks"; scenarioId = $scenarioIds[0] },
    @{ title = "DDoS Attack Response Plan"; description = "Response plan for DDoS attacks"; scenarioId = $scenarioIds[1] },
    @{ title = "Payment Processor Failure Plan"; description = "Response plan for payment processor outage"; scenarioId = $scenarioIds[2] },
    @{ title = "Cloud Provider Outage Plan"; description = "Response plan for cloud provider outage"; scenarioId = $scenarioIds[3] },
    @{ title = "Key Personnel Loss Plan"; description = "Response plan for key personnel loss"; scenarioId = $scenarioIds[4] }
)

$planIds = @()
foreach ($plan in $plans) {
    $planData = @{
        clientId = $clientId
        title = $plan.title
        description = $plan.description
        scenarioId = $plan.scenarioId
        status = "draft"
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.plans.create" -Data $planData
    if ($result.IsSuccess) {
        $planId = ($result.Body | ConvertFrom-Json).result.data.json[0].id
        $planIds += $planId
        Write-Output "Created plan '$($plan.title)' (ID: $planId)"
    } else {
        Write-Output "Failed to create plan '$($plan.title)': $($result.Body)"
    }
}
$results += "Step 5: Created $($planIds.Count) continuity plans"
Write-Output ""

# ============================================
# Step 6: Exercises and Testing
# ============================================
Write-Output "--- Step 6: Exercises and Testing ---"

$exercises = @(
    @{ planId = $planIds[0]; title = "Tabletop 1 - Ransomware"; type = "tabletop"; status = "Completed" },
    @{ planId = $planIds[1]; title = "Tabletop 2 - DDoS"; type = "tabletop"; status = "Completed" },
    @{ planId = $planIds[2]; title = "Simulation 1 - Payment"; type = "simulation"; status = "Completed" },
    @{ planId = $planIds[3]; title = "Full Drill - Cloud"; type = "drill"; status = "Completed" },
    @{ planId = $planIds[4]; title = "Tabletop 3 - Personnel"; type = "tabletop"; status = "Completed" }
)

$exerciseIds = @()
foreach ($ex in $exercises) {
    $exData = @{
        clientId = $clientId
        planId = $ex.planId
        title = $ex.title
        type = $ex.type
        status = $ex.status
        startDate = "2026-08-01"
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.plans.exercises.create" -Data $exData
    if ($result.IsSuccess) {
        $exId = ($result.Body | ConvertFrom-Json).result.data.json[0].id
        $exerciseIds += $exId
        Write-Output "Created exercise '$($ex.title)' (ID: $exId)"
    } else {
        Write-Output "Failed to create exercise '$($ex.title)': $($result.Body)"
    }
}
$results += "Step 6: Created $($exerciseIds.Count) exercises"
Write-Output ""

# ============================================
# Step 7: Generate BCP Document (Get Dashboard Metrics)
# ============================================
Write-Output "--- Step 7: Generate BCP Document ---"
$dashboardData = @{ clientId = $clientId }
$result = Invoke-TrpcQuery -Path "businessContinuity.getDashboardMetrics" -Data $dashboardData
Write-Output "Status: $($result.StatusCode)"
Write-Output "Dashboard Metrics: $($result.Body)"
$results += "Step 7: Generated BCP document (dashboard metrics retrieved)"
Write-Output ""

# ============================================
# Summary
# ============================================
Write-Output "=========================================="
Write-Output "CASE STUDY 4 IMPLEMENTATION COMPLETE"
Write-Output "=========================================="
Write-Output ""
Write-Output "Summary:"
foreach ($r in $results) {
    Write-Output "  - $r"
}
Write-Output ""
Write-Output "All steps completed!"