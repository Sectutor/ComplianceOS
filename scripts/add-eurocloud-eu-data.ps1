# Case Study 10: EuroCloud Services S.A. - EU GDPR + NIS2
# Client ID: 16
# Frameworks: GDPR (21 controls) + NIS2 (10 controls) + ISO 27001 (95 controls)

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

$clientId = 16
$successCount = 0
$failCount = 0

function Add-WithRetry {
    param([scriptblock]$Action, [string]$Label)
    $result = & $Action
    if ($result.Success) { $script:successCount++; Start-Sleep -Milliseconds 200 } else { $script:failCount++; Write-Host "FAIL: $Label"; Start-Sleep -Milliseconds 500 }
}

Write-Host "=== CASE STUDY 10: EUROCLOUD SERVICES S.A. ===" -ForegroundColor Cyan
Write-Host "Client ID: $clientId" -ForegroundColor Yellow

# ============================================
# STEP 1: Create GDPR Gap Analysis
# ============================================
Write-Host "`n--- Step 1: Creating GDPR Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "EuroCloud GDPR Compliance Gap Analysis"
    framework = "GDPR"
    scope = "All EU customer data processing, cloud services, employee data, marketing databases, and third-party data sharing"
}
Write-Host "GDPR Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$gdprGapId = 8

# ============================================
# STEP 2: Create NIS2 Gap Analysis
# ============================================
Write-Host "`n--- Step 2: Creating NIS2 Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "EuroCloud NIS2 Compliance Gap Analysis"
    framework = "NIS2"
    scope = "Essential and important entity services, network and information systems, supply chain security, incident reporting"
}
Write-Host "NIS2 Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$nis2GapId = 9

# ============================================
# STEP 3: Create ISO 27001 Gap Analysis
# ============================================
Write-Host "`n--- Step 3: Creating ISO 27001 Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "EuroCloud ISO 27001 ISMS Gap Analysis"
    framework = "ISO 27001"
    scope = "All cloud services, customer data processing, internal IT systems, and third-party integrations"
}
Write-Host "ISO 27001 Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$isoGapId = 10

# ============================================
# STEP 4: Add GDPR Gap Responses
# ============================================
Write-Host "`n--- Step 4: Adding GDPR Gap Responses ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$gdprControls = @(
    @{Id="GDPR.5.1"; Current="implemented"; Target="implemented"; Notes="Principles of data processing documented and followed"},
    @{Id="GDPR.6.1"; Current="partially_implemented"; Target="implemented"; Notes="Lawfulness of processing needs legal basis documentation"},
    @{Id="GDPR.7.1"; Current="partially_implemented"; Target="implemented"; Notes="Consent mechanisms need enhancement for marketing"},
    @{Id="GDPR.12.1"; Current="implemented"; Target="implemented"; Notes="Transparent privacy notices published"},
    @{Id="GDPR.15.1"; Current="partially_implemented"; Target="implemented"; Notes="Data subject access request process needs automation"},
    @{Id="GDPR.16.1"; Current="implemented"; Target="implemented"; Notes="Right to rectification process established"},
    @{Id="GDPR.17.1"; Current="partially_implemented"; Target="implemented"; Notes="Right to erasure needs automated deletion workflows"},
    @{Id="GDPR.20.1"; Current="not_implemented"; Target="implemented"; Notes="Data portability not yet supported"},
    @{Id="GDPR.24.1"; Current="partially_implemented"; Target="implemented"; Notes="Accountability framework needs documentation"},
    @{Id="GDPR.25.1"; Current="partially_implemented"; Target="implemented"; Notes="Privacy by design needs integration in SDLC"},
    @{Id="GDPR.28.1"; Current="implemented"; Target="implemented"; Notes="Processor agreements in place with all vendors"},
    @{Id="GDPR.30.1"; Current="partially_implemented"; Target="implemented"; Notes="Records of processing need completeness review"},
    @{Id="GDPR.32.1"; Current="implemented"; Target="implemented"; Notes="Security measures appropriate to risk level"},
    @{Id="GDPR.32.1.a"; Current="implemented"; Target="implemented"; Notes="Encryption implemented for personal data"},
    @{Id="GDPR.32.1.b"; Current="partially_implemented"; Target="implemented"; Notes="Security testing needs regular scheduling"},
    @{Id="GDPR.33.1"; Current="implemented"; Target="implemented"; Notes="72-hour breach notification procedure established"},
    @{Id="GDPR.34.1"; Current="partially_implemented"; Target="implemented"; Notes="Data subject breach communication needs templates"},
    @{Id="GDPR.35.1"; Current="partially_implemented"; Target="implemented"; Notes="DPIA process needs standardization"},
    @{Id="GDPR.37.1"; Current="implemented"; Target="implemented"; Notes="DPO appointed and registered with supervisory authority"},
    @{Id="GDPR.46.1"; Current="partially_implemented"; Target="implemented"; Notes="International transfer safeguards need SCC updates"},
    @{Id="GDPR.47.1"; Current="not_implemented"; Target="partially_implemented"; Notes="Binding corporate rules for multinational transfers"}
)

foreach ($ctrl in $gdprControls) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "gapAnalysis.updateResponse" @{
            assessmentId = $gdprGapId
            controlId = $ctrl.Id
            currentStatus = $ctrl.Current
            targetStatus = $ctrl.Target
            notes = $ctrl.Notes
        }
    } -Label $ctrl.Id
}

Write-Host "GDPR Gap Responses: $successCount success, $failCount failed"

# ============================================
# STEP 5: Add NIS2 Gap Responses
# ============================================
Write-Host "`n--- Step 5: Adding NIS2 Gap Responses ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$nis2Controls = @(
    @{Id="21(2)(a)"; Current="partially_implemented"; Target="implemented"; Notes="Risk management policies need NIS2-specific updates"},
    @{Id="21(2)(b)"; Current="partially_implemented"; Target="implemented"; Notes="Incident handling needs 24-hour reporting capability"},
    @{Id="21(2)(c)"; Current="partially_implemented"; Target="implemented"; Notes="Business continuity needs crisis management integration"},
    @{Id="21(2)(d)"; Current="partially_implemented"; Target="implemented"; Notes="Supply chain security needs supplier assessments"},
    @{Id="21(2)(e)"; Current="implemented"; Target="implemented"; Notes="Secure development practices established"},
    @{Id="21(2)(f)"; Current="partially_implemented"; Target="implemented"; Notes="Effectiveness monitoring needs metrics definition"},
    @{Id="21(2)(g)"; Current="implemented"; Target="implemented"; Notes="Cyber hygiene training program established"},
    @{Id="21(2)(h)"; Current="implemented"; Target="implemented"; Notes="Cryptography policies aligned with EU standards"},
    @{Id="21(2)(i)"; Current="partially_implemented"; Target="implemented"; Notes="HR security needs background check enhancement"},
    @{Id="21(2)(j)"; Current="implemented"; Target="implemented"; Notes="MFA and secure communications implemented"}
)

foreach ($ctrl in $nis2Controls) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "gapAnalysis.updateResponse" @{
            assessmentId = $nis2GapId
            controlId = $ctrl.Id
            currentStatus = $ctrl.Current
            targetStatus = $ctrl.Target
            notes = $ctrl.Notes
        }
    } -Label $ctrl.Id
}

Write-Host "NIS2 Gap Responses: $successCount success, $failCount failed"

# ============================================
# STEP 6: Add ISO 27001 Gap Responses
# ============================================
Write-Host "`n--- Step 6: Adding ISO 27001 Gap Responses ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$isoControls = @(
    @{Id="A.5.1"; Current="implemented"; Target="implemented"; Notes="Information security policies documented"},
    @{Id="A.5.2"; Current="implemented"; Target="implemented"; Notes="Management responsibilities assigned"},
    @{Id="A.5.3"; Current="partially_implemented"; Target="implemented"; Notes="Organizational roles need EU-specific definitions"},
    @{Id="A.5.4"; Current="implemented"; Target="implemented"; Notes="Management responsibility established"},
    @{Id="A.5.5"; Current="partially_implemented"; Target="implemented"; Notes="Contact with EU authorities needs formalization"},
    @{Id="A.5.6"; Current="implemented"; Target="implemented"; Notes="Contact with special interest groups established"},
    @{Id="A.5.7"; Current="partially_implemented"; Target="implemented"; Notes="Threat intelligence needs EU threat landscape"},
    @{Id="A.5.8"; Current="implemented"; Target="implemented"; Notes="Security in project management established"},
    @{Id="A.5.9"; Current="partially_implemented"; Target="implemented"; Notes="Inventory of assets needs cloud automation"},
    @{Id="A.5.10"; Current="implemented"; Target="implemented"; Notes="Acceptable use of assets documented"},
    @{Id="A.5.11"; Current="implemented"; Target="implemented"; Notes="Return of assets procedure established"},
    @{Id="A.5.12"; Current="partially_implemented"; Target="implemented"; Notes="Classification of information needs GDPR data categories"},
    @{Id="A.5.13"; Current="implemented"; Target="implemented"; Notes="Labeling of information per EU standards"},
    @{Id="A.5.14"; Current="partially_implemented"; Target="implemented"; Notes="Information transfer needs EU data transfer clauses"},
    @{Id="A.5.15"; Current="implemented"; Target="implemented"; Notes="Access control policy documented"},
    @{Id="A.5.16"; Current="partially_implemented"; Target="implemented"; Notes="Identity management needs EU eID integration"},
    @{Id="A.5.17"; Current="implemented"; Target="implemented"; Notes="Authentication information management established"},
    @{Id="A.5.18"; Current="partially_implemented"; Target="implemented"; Notes="Access rights review needs automation"},
    @{Id="A.5.19"; Current="implemented"; Target="implemented"; Notes="Supplier relationships security established"},
    @{Id="A.5.20"; Current="partially_implemented"; Target="implemented"; Notes="Supplier agreements need GDPR and NIS2 clauses"}
)

foreach ($ctrl in $isoControls) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "gapAnalysis.updateResponse" @{
            assessmentId = $isoGapId
            controlId = $ctrl.Id
            currentStatus = $ctrl.Current
            targetStatus = $ctrl.Target
            notes = $ctrl.Notes
        }
    } -Label $ctrl.Id
}

Write-Host "ISO 27001 Gap Responses: $successCount success, $failCount failed"

# ============================================
# STEP 7: Create Risk Assessments
# ============================================
Write-Host "`n--- Step 7: Creating EU Risk Assessments ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$euRisks = @(
    @{Title="GDPR data breach - EU customer PII"; Category="Data Protection"; Likelihood=3; Impact=5; Treatment="mitigate"},
    @{Title="NIS2 incident reporting failure"; Category="Compliance"; Likelihood=2; Impact=5; Treatment="mitigate"},
    @{Title="Cross-border data transfer violation"; Category="Compliance"; Likelihood=3; Impact=5; Treatment="mitigate"},
    @{Title="Cloud service provider data leak"; Category="Supply Chain"; Likelihood=2; Impact=5; Treatment="transfer"},
    @{Title="Ransomware attack on EU operations"; Category="Cybersecurity"; Likelihood=4; Impact=5; Treatment="mitigate"},
    @{Title="Insider threat - data exfiltration"; Category="Insider Threat"; Likelihood=3; Impact=4; Treatment="mitigate"},
    @{Title="EU regulatory investigation"; Category="Compliance"; Likelihood=2; Impact=4; Treatment="mitigate"},
    @{Title="Third-party processor non-compliance"; Category="Supply Chain"; Likelihood=3; Impact=4; Treatment="transfer"},
    @{Title="DDoS attack on cloud services"; Category="Cybersecurity"; Likelihood=4; Impact=4; Treatment="mitigate"},
    @{Title="Employee data processing violation"; Category="Privacy"; Likelihood=2; Impact=4; Treatment="mitigate"}
)

foreach ($risk in $euRisks) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "risks.upsert" @{
            clientId = $clientId
            title = $risk.Title
            category = $risk.Category
            likelihood = $risk.Likelihood
            impact = $risk.Impact
            treatmentOption = $risk.Treatment
        }
    } -Label $risk.Title
}

Write-Host "Risks: $successCount success, $failCount failed"

# ============================================
# STEP 8: Create EU Policies
# ============================================
Write-Host "`n--- Step 8: Creating EU Policies ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$euPolicies = @(
    @{Name="EU Data Protection Policy"; Module="privacy"; Status="approved"},
    @{Name="GDPR Compliance Policy"; Module="privacy"; Status="approved"},
    @{Name="NIS2 Security Measures Policy"; Module="cyber"; Status="approved"},
    @{Name="Cross-Border Data Transfer Policy"; Module="privacy"; Status="approved"},
    @{Name="Data Subject Rights Policy"; Module="privacy"; Status="approved"},
    @{Name="EU Incident Reporting Policy"; Module="cyber"; Status="approved"},
    @{Name="Privacy by Design Policy"; Module="privacy"; Status="approved"},
    @{Name="Processor Management Policy"; Module="general"; Status="approved"},
    @{Name="Data Breach Notification Policy"; Module="cyber"; Status="approved"},
    @{Name="EU Employee Data Protection Policy"; Module="privacy"; Status="approved"},
    @{Name="Cookie and Tracking Policy"; Module="privacy"; Status="approved"},
    @{Name="Data Retention and Deletion Policy"; Module="privacy"; Status="approved"},
    @{Name="Cloud Security Policy"; Module="cyber"; Status="approved"},
    @{Name="Business Continuity Policy"; Module="general"; Status="approved"},
    @{Name="Network Security Policy"; Module="cyber"; Status="approved"}
)

foreach ($policy in $euPolicies) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "clientPolicies.create" @{
            clientId = $clientId
            name = $policy.Name
            module = $policy.Module
            status = $policy.Status
        }
    } -Label $policy.Name
}

Write-Host "Policies: $successCount success, $failCount failed"

# ============================================
# STEP 9: Create BCP Project
# ============================================
Write-Host "`n--- Step 9: Creating BCP Program ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

Add-WithRetry -Action {
    Invoke-TrpcPost "businessContinuity.program.upsert" @{
        clientId = $clientId
        programName = "EuroCloud EU Business Continuity Program"
        scopeDescription = "All EU cloud services, customer data processing, inter-data center operations"
        policyStatement = "EuroCloud maintains critical cloud services during disruptive incidents per EU business continuity requirements"
        budgetAllocated = "250000"
        status = "active"
    }
} -Label "BCP Program"

# ============================================
# STEP 10: Create Business Processes
# ============================================
Write-Host "`n--- Step 10: Creating Business Processes ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$euProcesses = @(
    @{Name="Cloud Infrastructure Operations"; Department="IT Operations"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="Customer Data Processing"; Department="Data Services"; Criticality="Critical"; RTO="1 hour"; RPO="0 minutes"},
    @{Name="Identity and Access Management"; Department="Security"; Criticality="Critical"; RTO="30 minutes"; RPO="0 minutes"},
    @{Name="Data Center Operations"; Department="Infrastructure"; Criticality="Critical"; RTO="1 hour"; RPO="15 minutes"},
    @{Name="Customer Support Services"; Department="Support"; Criticality="High"; RTO="2 hours"; RPO="1 hour"},
    @{Name="Billing and Payment Processing"; Department="Finance"; Criticality="High"; RTO="4 hours"; RPO="1 hour"},
    @{Name="Marketing and Sales Operations"; Department="Marketing"; Criticality="Medium"; RTO="8 hours"; RPO="4 hours"},
    @{Name="HR and Recruitment"; Department="HR"; Criticality="Low"; RTO="24 hours"; RPO="8 hours"}
)

foreach ($proc in $euProcesses) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "businessContinuity.processes.create" @{
            clientId = $clientId
            name = $proc.Name
            department = $proc.Department
            criticalityTier = $proc.Criticality
            rto = $proc.RTO
            rpo = $proc.RPO
        }
    } -Label $proc.Name
}

Write-Host "Processes: $successCount success, $failCount failed"

# ============================================
# STEP 11: Create Vendors
# ============================================
Write-Host "`n--- Step 11: Creating EU Vendors ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$euVendors = @(
    @{Name="EU Cloud Hosting GmbH"; Category="Cloud Infrastructure"; Criticality="Critical"; DataAccess="PII"},
    @{Name="SecureID Europe"; Category="Identity Management"; Criticality="Critical"; DataAccess="PII"},
    @{Name="DataProtect Analytics"; Category="Data Analytics"; Criticality="High"; DataAccess="PII"},
    @{Name="EuroNet Communications"; Category="Network Services"; Criticality="High"; DataAccess="Sensitive"},
    @{Name="GDPR Consulting Partners"; Category="Compliance Consulting"; Criticality="Medium"; DataAccess="Sensitive"},
    @{Name="EU Payment Services"; Category="Payment Processing"; Criticality="Critical"; DataAccess="PII"},
    @{Name="CloudBackup EU"; Category="Data Backup"; Criticality="High"; DataAccess="PII"},
    @{Name="SecureDev Europe"; Category="Application Development"; Criticality="Medium"; DataAccess="Internal"}
)

foreach ($vendor in $euVendors) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "vendorAssessments.createVendor" @{
            clientId = $clientId
            name = $vendor.Name
            category = $vendor.Category
            criticality = $vendor.Criticality
            dataAccess = $vendor.DataAccess
            status = "Active"
            reviewStatus = "active"
        }
    } -Label $vendor.Name
}

Write-Host "Vendors: $successCount success, $failCount failed"

# ============================================
# STEP 12: Schedule Audit
# ============================================
Write-Host "`n--- Step 12: Scheduling EU Audit ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

Add-WithRetry -Action {
    Invoke-TrpcPost "audit.scheduleAudit" @{
        clientId = $clientId
        frameworkId = 1
        title = "EU GDPR Compliance Audit"
        type = "External"
        plannedDate = "2026-12-01"
        scope = "General Data Protection Regulation compliance audit for EU operations"
        auditorEmail = "audit@eu-gdpr-auditors.eu"
        auditorName = "EU Data Protection Auditor"
    }
} -Label "GDPR Audit"

Write-Host "`n=== EUROCLOUD EU CASE STUDY COMPLETE ===" -ForegroundColor Cyan
