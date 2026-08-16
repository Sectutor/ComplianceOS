# Complete Case Study Implementation - Missing Data
# Creates policies, business processes, vendors, and audits for clients 15, 16, 17

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

$successCount = 0
$failCount = 0

# ============================================
# CLIENT 15: FDSA - Missing Policies (6 more to reach 15)
# ============================================
Write-Host "`n=== CLIENT 15: FDSA - Creating Missing Policies ===" -ForegroundColor Green

$federalPolicies = @(
    @{Name="Federal Information Security Policy"; Module="general"; Status="approved"},
    @{Name="FedRAMP Security Assessment Policy"; Module="general"; Status="approved"},
    @{Name="Federal Access Control Policy"; Module="general"; Status="approved"},
    @{Name="Federal Incident Response Policy"; Module="cyber"; Status="approved"},
    @{Name="Federal Business Continuity Policy"; Module="general"; Status="approved"},
    @{Name="Federal Cryptography Policy"; Module="cyber"; Status="approved"}
)

foreach ($policy in $federalPolicies) {
    $result = Invoke-TrpcPost "clientPolicies.create" @{
        clientId = 15
        name = $policy.Name
        module = $policy.Module
        status = $policy.Status
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($policy.Name) - $($result.Body)" }
}

Write-Host "FDSA Policies: $successCount success, $failCount failed"

# ============================================
# CLIENT 15: FDSA - Business Processes
# ============================================
Write-Host "`n=== CLIENT 15: FDSA - Creating Business Processes ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalProcesses = @(
    @{Name="Citizen Identity Verification"; Department="Digital Services"; Criticality="Critical"; RTO="1 hour"; RPO="0 minutes"},
    @{Name="Federal Benefits Processing"; Department="Benefits Administration"; Criticality="Critical"; RTO="30 minutes"; RPO="0 minutes"},
    @{Name="Tax Filing Services"; Department="Revenue Services"; Criticality="Critical"; RTO="1 hour"; RPO="15 minutes"},
    @{Name="Healthcare Enrollment"; Department="Health Services"; Criticality="Critical"; RTO="2 hours"; RPO="0 minutes"},
    @{Name="Immigration Case Management"; Department="Immigration Services"; Criticality="High"; RTO="4 hours"; RPO="1 hour"},
    @{Name="Federal Payment Processing"; Department="Financial Services"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="Inter-agency Data Exchange"; Department="IT Operations"; Criticality="High"; RTO="2 hours"; RPO="30 minutes"},
    @{Name="Public Website Services"; Department="Communications"; Criticality="High"; RTO="1 hour"; RPO="1 hour"}
)

foreach ($proc in $federalProcesses) {
    $result = Invoke-TrpcPost "businessContinuity.processes.create" @{
        clientId = 15
        name = $proc.Name
        department = $proc.Department
        criticalityTier = $proc.Criticality
        rto = $proc.RTO
        rpo = $proc.RPO
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($proc.Name) - $($result.Body)" }
}

Write-Host "FDSA Business Processes: $successCount success, $failCount failed"

# ============================================
# CLIENT 15: FDSA - Vendors
# ============================================
Write-Host "`n=== CLIENT 15: FDSA - Creating Vendors ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalVendors = @(
    @{Name="CloudGov Solutions"; Category="FedRAMP Cloud IaaS"; Criticality="Critical"; DataAccess="PII"},
    @{Name="SecureAuth Federal"; Category="Identity Management"; Criticality="Critical"; DataAccess="PII"},
    @{Name="FedData Analytics"; Category="Data Analytics"; Criticality="High"; DataAccess="PII"},
    @{Name="CyberDefense Federal"; Category="Security Operations"; Criticality="Critical"; DataAccess="Sensitive"},
    @{Name="NetFederal Communications"; Category="Network Services"; Criticality="High"; DataAccess="Sensitive"},
    @{Name="AppDev Federal"; Category="Application Development"; Criticality="Medium"; DataAccess="Internal"},
    @{Name="TrainFederal Security"; Category="Security Training"; Criticality="Low"; DataAccess="None"},
    @{Name="AuditFederal Services"; Category="Compliance Audit"; Criticality="High"; DataAccess="Sensitive"}
)

foreach ($vendor in $federalVendors) {
    $result = Invoke-TrpcPost "vendorAssessments.createVendor" @{
        clientId = 15
        name = $vendor.Name
        category = $vendor.Category
        criticality = $vendor.Criticality
        dataAccess = $vendor.DataAccess
        status = "Active"
        reviewStatus = "active"
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($vendor.Name) - $($result.Body)" }
}

Write-Host "FDSA Vendors: $successCount success, $failCount failed"

# ============================================
# CLIENT 15: FDSA - Audit
# ============================================
Write-Host "`n=== CLIENT 15: FDSA - Scheduling Audit ===" -ForegroundColor Green
$result = Invoke-TrpcPost "audit.scheduleAudit" @{
    clientId = 15
    frameworkId = 1
    title = "FISMA Annual Security Audit"
    type = "External"
    plannedDate = "2026-11-01"
    scope = "Annual Federal Information Security Modernization Act compliance audit"
    auditorEmail = "audit@ig.gov"
    auditorName = "Inspector General"
}
Write-Host "FDSA Audit: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"

Write-Host "`n=== FDSA FEDERAL CASE STUDY COMPLETE ===" -ForegroundColor Cyan
