# Complete Case Study Implementation - EuroCloud (Client 16) & NexGen AI (Client 17)

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
# CLIENT 16: EuroCloud - Missing Policies (13 more to reach 15)
# ============================================
Write-Host "`n=== CLIENT 16: EuroCloud - Creating Missing Policies ===" -ForegroundColor Green

$euPolicies = @(
    @{Name="EU Data Protection Policy"; Module="privacy"; Status="approved"},
    @{Name="GDPR Consent Management Policy"; Module="privacy"; Status="approved"},
    @{Name="EU Cross-Border Data Transfer Policy"; Module="privacy"; Status="approved"},
    @{Name="NIS2 Incident Reporting Policy"; Module="cyber"; Status="approved"},
    @{Name="EU Vendor Risk Management Policy"; Module="general"; Status="approved"},
    @{Name="EU Data Retention Policy"; Module="privacy"; Status="approved"},
    @{Name="EU Employee Data Protection Policy"; Module="privacy"; Status="approved"},
    @{Name="EU Marketing Compliance Policy"; Module="privacy"; Status="approved"},
    @{Name="EU Data Subject Rights Policy"; Module="privacy"; Status="approved"},
    @{Name="EU Network Security Policy"; Module="cyber"; Status="approved"},
    @{Name="EU Access Control Policy"; Module="general"; Status="approved"},
    @{Name="EU Business Continuity Policy"; Module="general"; Status="approved"},
    @{Name="EU Cryptography Policy"; Module="cyber"; Status="approved"}
)

foreach ($policy in $euPolicies) {
    $result = Invoke-TrpcPost "clientPolicies.create" @{
        clientId = 16
        name = $policy.Name
        module = $policy.Module
        status = $policy.Status
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($policy.Name) - $($result.Body)" }
}

Write-Host "EuroCloud Policies: $successCount success, $failCount failed"

# ============================================
# CLIENT 16: EuroCloud - Business Processes
# ============================================
Write-Host "`n=== CLIENT 16: EuroCloud - Creating Business Processes ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$euProcesses = @(
    @{Name="Cloud Service Delivery"; Department="Cloud Operations"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="Customer Data Processing"; Department="Data Services"; Criticality="Critical"; RTO="30 minutes"; RPO="0 minutes"},
    @{Name="EU Data Center Operations"; Department="Infrastructure"; Criticality="Critical"; RTO="1 hour"; RPO="15 minutes"},
    @{Name="Incident Response EU"; Department="Security"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="Customer Support Services"; Department="Support"; Criticality="High"; RTO="2 hours"; RPO="1 hour"},
    @{Name="Software Development"; Department="Engineering"; Criticality="High"; RTO="4 hours"; RPO="2 hours"},
    @{Name="HR and Payroll Processing"; Department="Human Resources"; Criticality="Medium"; RTO="8 hours"; RPO="4 hours"},
    @{Name="Marketing and Sales"; Department="Commercial"; Criticality="Medium"; RTO="24 hours"; RPO="12 hours"}
)

foreach ($proc in $euProcesses) {
    $result = Invoke-TrpcPost "businessContinuity.processes.create" @{
        clientId = 16
        name = $proc.Name
        department = $proc.Department
        criticalityTier = $proc.Criticality
        rto = $proc.RTO
        rpo = $proc.RPO
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($proc.Name) - $($result.Body)" }
}

Write-Host "EuroCloud Business Processes: $successCount success, $failCount failed"

# ============================================
# CLIENT 16: EuroCloud - Vendors
# ============================================
Write-Host "`n=== CLIENT 16: EuroCloud - Creating Vendors ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$euVendors = @(
    @{Name="EU Cloud Hosting SA"; Category="Cloud IaaS"; Criticality="Critical"; DataAccess="PII"},
    @{Name="SecureID Europe"; Category="Identity Management"; Criticality="Critical"; DataAccess="PII"},
    @{Name="DataAnalytics EU"; Category="Data Analytics"; Criticality="High"; DataAccess="PII"},
    @{Name="CyberShield Europe"; Category="Security Operations"; Criticality="Critical"; DataAccess="Sensitive"},
    @{Name="NetConnect EU"; Category="Network Services"; Criticality="High"; DataAccess="Sensitive"},
    @{Name="AppFactory Berlin"; Category="Application Development"; Criticality="Medium"; DataAccess="Internal"},
    @{Name="TrainSecure EU"; Category="Security Training"; Criticality="Low"; DataAccess="None"},
    @{Name="AuditPartners Europe"; Category="Compliance Audit"; Criticality="High"; DataAccess="Sensitive"}
)

foreach ($vendor in $euVendors) {
    $result = Invoke-TrpcPost "vendorAssessments.createVendor" @{
        clientId = 16
        name = $vendor.Name
        category = $vendor.Category
        criticality = $vendor.Criticality
        dataAccess = $vendor.DataAccess
        status = "Active"
        reviewStatus = "active"
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($vendor.Name) - $($result.Body)" }
}

Write-Host "EuroCloud Vendors: $successCount success, $failCount failed"

# ============================================
# CLIENT 16: EuroCloud - Audit
# ============================================
Write-Host "`n=== CLIENT 16: EuroCloud - Scheduling Audit ===" -ForegroundColor Green
$result = Invoke-TrpcPost "audit.scheduleAudit" @{
    clientId = 16
    frameworkId = 2
    title = "GDPR Compliance Audit"
    type = "External"
    plannedDate = "2026-12-01"
    scope = "General Data Protection Regulation compliance audit for EU operations"
    auditorEmail = "audit@eu-dpb.eu"
    auditorName = "EU Data Protection Board Auditor"
}
Write-Host "EuroCloud Audit: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"

Write-Host "`n=== EUROCLOUD CASE STUDY COMPLETE ===" -ForegroundColor Cyan

# ============================================
# CLIENT 17: NexGen AI - Missing Policies (7 more to reach 16)
# ============================================
Write-Host "`n=== CLIENT 17: NexGen AI - Creating Missing Policies ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiPolicies = @(
    @{Name="AI Governance Policy"; Module="general"; Status="approved"},
    @{Name="AI Ethics and Fairness Policy"; Module="general"; Status="approved"},
    @{Name="AI Safety and Alignment Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Training Data Management Policy"; Module="privacy"; Status="approved"},
    @{Name="AI Model Security Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Privacy Protection Policy"; Module="privacy"; Status="approved"},
    @{Name="AI Vendor and Third-Party Policy"; Module="general"; Status="approved"}
)

foreach ($policy in $aiPolicies) {
    $result = Invoke-TrpcPost "clientPolicies.create" @{
        clientId = 17
        name = $policy.Name
        module = $policy.Module
        status = $policy.Status
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($policy.Name) - $($result.Body)" }
}

Write-Host "NexGen AI Policies: $successCount success, $failCount failed"

# ============================================
# CLIENT 17: NexGen AI - Business Processes
# ============================================
Write-Host "`n=== CLIENT 17: NexGen AI - Creating Business Processes ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiProcesses = @(
    @{Name="AI Model Development"; Department="AI Research"; Criticality="Critical"; RTO="1 hour"; RPO="0 minutes"},
    @{Name="Training Data Pipeline"; Department="Data Engineering"; Criticality="Critical"; RTO="30 minutes"; RPO="0 minutes"},
    @{Name="AI Model Deployment"; Department="MLOps"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="AI Inference Services"; Department="Platform"; Criticality="Critical"; RTO="5 minutes"; RPO="0 minutes"},
    @{Name="AI Safety Testing"; Department="AI Safety"; Criticality="High"; RTO="4 hours"; RPO="1 hour"},
    @{Name="Customer AI Services"; Department="Product"; Criticality="High"; RTO="2 hours"; RPO="30 minutes"},
    @{Name="AI Research and Development"; Department="Research"; Criticality="Medium"; RTO="8 hours"; RPO="4 hours"},
    @{Name="AI Ethics Review"; Department="Governance"; Criticality="Medium"; RTO="24 hours"; RPO="12 hours"}
)

foreach ($proc in $aiProcesses) {
    $result = Invoke-TrpcPost "businessContinuity.processes.create" @{
        clientId = 17
        name = $proc.Name
        department = $proc.Department
        criticalityTier = $proc.Criticality
        rto = $proc.RTO
        rpo = $proc.RPO
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($proc.Name) - $($result.Body)" }
}

Write-Host "NexGen AI Business Processes: $successCount success, $failCount failed"

# ============================================
# CLIENT 17: NexGen AI - Vendors
# ============================================
Write-Host "`n=== CLIENT 17: NexGen AI - Creating Vendors ===" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiVendors = @(
    @{Name="GPUCloud AI"; Category="AI Compute"; Criticality="Critical"; DataAccess="PII"},
    @{Name="DataLabel Pro"; Category="Data Annotation"; Criticality="Critical"; DataAccess="PII"},
    @{Name="ModelVault Security"; Category="AI Security"; Criticality="Critical"; DataAccess="Sensitive"},
    @{Name="AIEthics Audit"; Category="AI Audit"; Criticality="High"; DataAccess="Sensitive"},
    @{Name="AI Data Storage"; Category="Cloud Storage"; Criticality="High"; DataAccess="PII"},
    @{Name="MLOps Platform"; Category="AI Operations"; Criticality="High"; DataAccess="Internal"},
    @{Name="AI Safety Training"; Category="AI Training"; Criticality="Low"; DataAccess="None"},
    @{Name="AI Compliance Services"; Category="Compliance Audit"; Criticality="High"; DataAccess="Sensitive"}
)

foreach ($vendor in $aiVendors) {
    $result = Invoke-TrpcPost "vendorAssessments.createVendor" @{
        clientId = 17
        name = $vendor.Name
        category = $vendor.Category
        criticality = $vendor.Criticality
        dataAccess = $vendor.DataAccess
        status = "Active"
        reviewStatus = "active"
    }
    if ($result.Success) { $successCount++ } else { $failCount++; Write-Host "FAIL: $($vendor.Name) - $($result.Body)" }
}

Write-Host "NexGen AI Vendors: $successCount success, $failCount failed"

# ============================================
# CLIENT 17: NexGen AI - Audit
# ============================================
Write-Host "`n=== CLIENT 17: NexGen AI - Scheduling Audit ===" -ForegroundColor Green
$result = Invoke-TrpcPost "audit.scheduleAudit" @{
    clientId = 17
    frameworkId = 8
    title = "AI Governance Audit"
    type = "External"
    plannedDate = "2026-12-15"
    scope = "AI governance, ethics, and security audit for AI/ML operations"
    auditorEmail = "audit@ai-governance.org"
    auditorName = "AI Governance Auditor"
}
Write-Host "NexGen AI Audit: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"

Write-Host "`n=== NEXGEN AI CASE STUDY COMPLETE ===" -ForegroundColor Cyan
Write-Host "`n=== ALL CASE STUDIES IMPLEMENTED ===" -ForegroundColor Yellow
