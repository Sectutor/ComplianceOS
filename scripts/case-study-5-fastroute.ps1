# Case Study 5: FastRoute BIA Implementation - All 6 Steps
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
Write-Output "CASE STUDY 5: FastRoute BIA Implementation"
Write-Output "Client ID: $clientId"
Write-Output "=========================================="
Write-Output ""

# ============================================
# Step 1: Define BIA Scope and Methodology
# ============================================
Write-Output "--- Step 1: Define BIA Scope and Methodology ---"

# Create a new BIA program for FastRoute
$programData = @{
    clientId = $clientId
    programName = "FastRoute BIA Program"
    scopeDescription = "Dispatch operations, warehouse operations, customer portal. Headquarters + 3 regional hubs."
    policyStatement = "FastRoute will quantify financial impact of potential disruptions and set data-driven recovery priorities. Impact criteria: Financial (revenue loss, penalties), Operational (service disruption), Legal/Regulatory (contractual breaches), Reputational (customer churn)."
    budgetAllocated = "75000"
    status = "draft"
}
$result = Invoke-TrpcMutation -Path "businessContinuity.program.upsert" -Data $programData
Write-Output "Status: $($result.StatusCode)"
if ($result.IsSuccess) {
    $programId = ($result.Body | ConvertFrom-Json).result.data.json[0].id
    Write-Output "Program ID: $programId"
    $results += "Step 1: BIA Scope created (ID: $programId)"
} else {
    Write-Output "Response: $($result.Body)"
    $results += "Step 1: FAILED"
}
Write-Output ""

# ============================================
# Step 2: Identify Critical Processes
# ============================================
Write-Output "--- Step 2: Identify Critical Processes ---"

# FastRoute has 12 business processes across dispatch and warehouse operations
$processes = @(
    # Dispatch Operations (8 processes)
    @{ name = "Vehicle dispatch"; description = "Dispatch vehicles for deliveries"; department = "Dispatch"; criticalityTier = "Critical"; rto = "2 hours"; rpo = "15 minutes" },
    @{ name = "Route optimization"; description = "Optimize delivery routes"; department = "Dispatch"; criticalityTier = "Critical"; rto = "4 hours"; rpo = "1 hour" },
    @{ name = "Driver communication"; description = "Communicate with drivers"; department = "Dispatch"; criticalityTier = "Essential"; rto = "1 hour"; rpo = "N/A" },
    @{ name = "Delivery confirmation"; description = "Confirm delivery completion"; department = "Dispatch"; criticalityTier = "Essential"; rto = "4 hours"; rpo = "1 hour" },
    @{ name = "Exception handling"; description = "Handle delivery exceptions"; department = "Dispatch"; criticalityTier = "Important"; rto = "8 hours"; rpo = "2 hours" },
    @{ name = "Customer notifications"; description = "Notify customers of status"; department = "Dispatch"; criticalityTier = "Important"; rto = "8 hours"; rpo = "2 hours" },
    @{ name = "Proof of delivery capture"; description = "Capture proof of delivery"; department = "Dispatch"; criticalityTier = "Non-essential"; rto = "24 hours"; rpo = "4 hours" },
    @{ name = "Performance reporting"; description = "Generate performance reports"; department = "Dispatch"; criticalityTier = "Non-essential"; rto = "48 hours"; rpo = "24 hours" },
    # Warehouse Operations (4 processes)
    @{ name = "Receiving and put-away"; description = "Receive and store inventory"; department = "Warehouse"; criticalityTier = "Essential"; rto = "4 hours"; rpo = "1 hour" },
    @{ name = "Order picking"; description = "Pick orders for shipment"; department = "Warehouse"; criticalityTier = "Critical"; rto = "2 hours"; rpo = "30 minutes" },
    @{ name = "Shipping"; description = "Ship orders to customers"; department = "Warehouse"; criticalityTier = "Critical"; rto = "2 hours"; rpo = "1 hour" },
    @{ name = "Inventory management"; description = "Manage inventory levels"; department = "Warehouse"; criticalityTier = "Important"; rto = "8 hours"; rpo = "2 hours" }
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
# Step 3: Impact Assessment (Create BIAs for critical processes)
# ============================================
Write-Output "--- Step 3: Impact Assessment ---"

# Create BIA records for each process
$biaIds = @()
for ($i = 0; $i -lt $processIds.Count; $i++) {
    $procId = $processIds[$i]
    $proc = $processes[$i]
    
    $biaData = @{
        clientId = $clientId
        processId = $procId
        title = "BIA Assessment: $($proc.name)"
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.bia.create" -Data $biaData
    if ($result.IsSuccess) {
        $biaId = ($result.Body | ConvertFrom-Json).result.data.json.id
        $biaIds += $biaId
        Write-Output "Created BIA for '$($proc.name)' (ID: $biaId)"
    } else {
        Write-Output "Failed to create BIA for '$($proc.name)': $($result.Body)"
    }
}
$results += "Step 3: Created $($biaIds.Count) BIA assessments"
Write-Output ""

# ============================================
# Step 4: Map Dependencies (Add dependencies to processes)
# ============================================
Write-Output "--- Step 4: Map Dependencies ---"

# Add IT system dependencies for critical processes
$dependencies = @(
    @{ processId = $processIds[0]; dependencyType = "IT System"; dependencyName = "Custom Dispatch App"; criticality = "Critical"; notes = "Primary dispatch system" },
    @{ processId = $processIds[0]; dependencyType = "Vendor"; dependencyName = "GPS Fleet Tracking"; criticality = "Critical"; notes = "Real-time GPS tracking SLA 99.5%" },
    @{ processId = $processIds[1]; dependencyType = "IT System"; dependencyName = "Route optimization API"; criticality = "High"; notes = "Cloud-based route planning" },
    @{ processId = $processIds[1]; dependencyType = "Vendor"; dependencyName = "Map Provider"; criticality = "High"; notes = "Mapping API SLA 99.9%" },
    @{ processId = $processIds[8]; dependencyType = "IT System"; dependencyName = "WMS"; criticality = "Critical"; notes = "Warehouse Management System" },
    @{ processId = $processIds[9]; dependencyType = "IT System"; dependencyName = "WMS"; criticality = "Critical"; notes = "Warehouse Management System" },
    @{ processId = $processIds[10]; dependencyType = "Vendor"; dependencyName = "FedEx/UPS/DHL"; criticality = "Critical"; notes = "Shipping APIs SLA 99.9%" }
)

$depCount = 0
foreach ($dep in $dependencies) {
    $depData = @{
        processId = $dep.processId
        dependencyType = $dep.dependencyType
        dependencyName = $dep.dependencyName
        criticality = $dep.criticality
        notes = $dep.notes
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.processes.addDependency" -Data $depData
    if ($result.IsSuccess) {
        $depId = ($result.Body | ConvertFrom-Json).result.data.json.id
        Write-Output "Added dependency '$($dep.dependencyName)' (ID: $depId)"
        $depCount++
    } else {
        Write-Output "Failed to add dependency '$($dep.dependencyName)': $($result.Body)"
    }
}
$results += "Step 4: Mapped $depCount dependencies"
Write-Output ""

# ============================================
# Step 5: Define RTO and RPO (Create Recovery Objectives)
# ============================================
Write-Output "--- Step 5: Define RTO and RPO ---"

# FastRoute's RTO/RPO Targets
$rtoRpoTargets = @(
    @{ biaId = $biaIds[0]; activity = "Full Recovery"; criticality = "Critical"; rto = "2 hours"; rpo = "15 minutes"; mtpd = "4 hours"; dependencies = "GPS, Custom App"; resources = "3 dispatchers, backup server" },
    @{ biaId = $biaIds[1]; activity = "Full Recovery"; criticality = "Critical"; rto = "4 hours"; rpo = "1 hour"; mtpd = "8 hours"; dependencies = "Map API"; resources = "1 route planner" },
    @{ biaId = $biaIds[8]; activity = "Full Recovery"; criticality = "Essential"; rto = "4 hours"; rpo = "1 hour"; mtpd = "8 hours"; dependencies = "WMS"; resources = "Warehouse staff" },
    @{ biaId = $biaIds[9]; activity = "Full Recovery"; criticality = "Critical"; rto = "2 hours"; rpo = "30 minutes"; mtpd = "4 hours"; dependencies = "WMS"; resources = "15 warehouse staff" },
    @{ biaId = $biaIds[10]; activity = "Full Recovery"; criticality = "Critical"; rto = "2 hours"; rpo = "1 hour"; mtpd = "4 hours"; dependencies = "Shipping APIs"; resources = "4 shipping clerks" },
    @{ biaId = $biaIds[3]; activity = "Full Recovery"; criticality = "Essential"; rto = "1 hour"; rpo = "N/A"; mtpd = "2 hours"; dependencies = "Phone/Radio"; resources = "Driver supervisors" }
)

$rtoCount = 0
foreach ($target in $rtoRpoTargets) {
    $roData = @{
        biaId = $target.biaId
        activity = $target.activity
        criticality = $target.criticality
        rto = $target.rto
        rpo = $target.rpo
        mtpd = $target.mtpd
        dependencies = $target.dependencies
        resources = $target.resources
    }
    $result = Invoke-TrpcMutation -Path "businessContinuity.bia.saveRecoveryObjective" -Data $roData
    if ($result.IsSuccess) {
        $roId = ($result.Body | ConvertFrom-Json).result.data.json.id
        Write-Output "Saved RTO/RPO for BIA $($target.biaId) (ID: $roId)"
        $rtoCount++
    } else {
        Write-Output "Failed to save RTO/RPO for BIA $($target.biaId): $($result.Body)"
    }
}
$results += "Step 5: Defined RTO/RPO for $rtoCount processes"
Write-Output ""

# ============================================
# Step 6: Generate BIA Report (Get Dashboard Metrics)
# ============================================
Write-Output "--- Step 6: Generate BIA Report ---"
$dashboardData = @{ clientId = $clientId }
$result = Invoke-TrpcQuery -Path "businessContinuity.getDashboardMetrics" -Data $dashboardData
Write-Output "Status: $($result.StatusCode)"
Write-Output "Dashboard Metrics: $($result.Body)"
$results += "Step 6: Generated BIA report"
Write-Output ""

# ============================================
# Summary
# ============================================
Write-Output "=========================================="
Write-Output "CASE STUDY 5 IMPLEMENTATION COMPLETE"
Write-Output "=========================================="
Write-Output ""
Write-Output "Summary:"
foreach ($r in $results) {
    Write-Output "  - $r"
}
Write-Output ""
Write-Output "All steps completed!"