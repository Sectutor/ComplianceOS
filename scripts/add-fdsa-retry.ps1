# Retry script for FDSA Federal Case Study - with rate limiting protection
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

$clientId = 15
$successCount = 0
$failCount = 0

function Add-WithRetry {
    param([scriptblock]$Action, [string]$Label)
    $result = & $Action
    if ($result.Success) {
        $script:successCount++
        Start-Sleep -Milliseconds 200
    } else {
        $script:failCount++
        Write-Host "FAIL: $Label - $($result.Body.Substring(0, [Math]::Min(100, $result.Body.Length)))"
        Start-Sleep -Milliseconds 500
    }
}

Write-Host "=== FDSA RETRY - Rate Limited Operations ===" -ForegroundColor Cyan

# Retry failed ISO 27001 gap responses
Write-Host "`n--- Retrying ISO 27001 Gap Responses ---" -ForegroundColor Green
$isoGapId = 7
$failedResponses = @(
    @{ControlId="A.5.22"; Current="partially_implemented"; Target="implemented"; Notes="Change management needs federal approval"},
    @{ControlId="A.5.23"; Current="implemented"; Target="implemented"; Notes="Cloud service security established"},
    @{ControlId="A.5.24"; Current="partially_implemented"; Target="implemented"; Notes="Incident management needs federal procedures"},
    @{ControlId="A.5.25"; Current="implemented"; Target="implemented"; Notes="Assessment decisions documented"},
    @{ControlId="A.5.26"; Current="partially_implemented"; Target="implemented"; Notes="Incident response plan needs federal integration"},
    @{ControlId="A.5.27"; Current="implemented"; Target="implemented"; Notes="Evidence collection procedures established"},
    @{ControlId="A.5.28"; Current="partially_implemented"; Target="implemented"; Notes="Business continuity integration needed"}
)

foreach ($resp in $failedResponses) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "gapAnalysis.updateResponse" @{
            assessmentId = $isoGapId
            controlId = $resp.ControlId
            currentStatus = $resp.Current
            targetStatus = $resp.Target
            notes = $resp.Notes
        }
    } -Label $resp.ControlId
}

# Create Risk Assessments
Write-Host "`n--- Creating Risk Assessments ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalRisks = @(
    @{Title="Nation-state cyber attack on federal systems"; Category="Cybersecurity"; Likelihood=3; Impact=5; Treatment="mitigate"; Notes="Advanced persistent threat targeting federal data"},
    @{Title="FedRAMP authorization failure"; Category="Compliance"; Likelihood=2; Impact=5; Treatment="mitigate"; Notes="Risk of losing cloud service authorization"},
    @{Title="Insider threat from privileged user"; Category="Insider Threat"; Likelihood=3; Impact=4; Treatment="mitigate"; Notes="Federal employee with elevated access"},
    @{Title="Supply chain compromise via federal vendor"; Category="Supply Chain"; Likelihood=3; Impact=5; Treatment="transfer"; Notes="Third-party vendor with federal system access"},
    @{Title="Ransomware attack on citizen services"; Category="Cybersecurity"; Likelihood=4; Impact=5; Treatment="mitigate"; Notes="Critical citizen-facing systems at risk"},
    @{Title="Data breach of PII records"; Category="Data Protection"; Likelihood=3; Impact=5; Treatment="mitigate"; Notes="Citizen personal information exposure"},
    @{Title="Legacy system vulnerability exploitation"; Category="Vulnerability"; Likelihood=4; Impact=4; Treatment="mitigate"; Notes="Outdated federal IT infrastructure"},
    @{Title="Inter-agency data sharing breach"; Category="Data Protection"; Likelihood=2; Impact=4; Treatment="mitigate"; Notes="Cross-agency information exchange risk"},
    @{Title="Cloud service provider outage"; Category="Availability"; Likelihood=3; Impact=5; Treatment="transfer"; Notes="FedRAMP-authorized CSP downtime"},
    @{Title="Non-compliance with FISMA requirements"; Category="Compliance"; Likelihood=2; Impact=4; Treatment="mitigate"; Notes="Federal Information Security Modernization Act violation"}
)

foreach ($risk in $federalRisks) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "risks.upsert" @{
            clientId = $clientId
            title = $risk.Title
            category = $risk.Category
            likelihood = $risk.Likelihood
            impact = $risk.Impact
            treatmentOption = $risk.Treatment
            notes = $risk.Notes
            status = "open"
        }
    } -Label $risk.Title
}

Write-Host "Risks: $successCount success, $failCount failed"

# Create Policies
Write-Host "`n--- Creating Federal Policies ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$federalPolicies = @(
    @{Name="Federal Information Security Policy"; Module="general"; Status="approved"},
    @{Name="FedRAMP Security Assessment Policy"; Module="general"; Status="approved"},
    @{Name="Federal Access Control Policy"; Module="general"; Status="approved"},
    @{Name="Federal Incident Response Policy"; Module="cyber"; Status="approved"},
    @{Name="Federal Business Continuity Policy"; Module="general"; Status="approved"},
    @{Name="Federal Data Classification Policy"; Module="general"; Status="approved"},
    @{Name="Federal Supplier Risk Management Policy"; Module="general"; Status="approved"},
    @{Name="Federal Cryptography Policy"; Module="cyber"; Status="approved"},
    @{Name="Federal Personnel Security Policy"; Module="general"; Status="approved"},
    @{Name="Federal Physical Security Policy"; Module="general"; Status="approved"},
    @{Name="Federal System Development Security Policy"; Module="cyber"; Status="approved"},
    @{Name="Federal Network Security Policy"; Module="cyber"; Status="approved"},
    @{Name="Federal Privacy Policy"; Module="privacy"; Status="approved"},
    @{Name="Federal Records Management Policy"; Module="general"; Status="approved"},
    @{Name="Federal Continuous Monitoring Policy"; Module="cyber"; Status="approved"}
)

foreach ($policy in $federalPolicies) {
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

# Create BCP Program
Write-Host "`n--- Creating BCP Program ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

Add-WithRetry -Action {
    Invoke-TrpcPost "businessContinuity.program.upsert" @{
        clientId = $clientId
        programName = "FDSA Federal Continuity Program"
        scopeDescription = "All federal citizen services, inter-agency systems, cloud infrastructure"
        policyStatement = "FDSA maintains critical federal services during disruptive incidents per FCD 1 and NSPD-51"
        budgetAllocated = "500000"
        status = "active"
    }
} -Label "BCP Program"

# Create Business Processes
Write-Host "`n--- Creating Business Processes ---" -ForegroundColor Green
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

# Create Vendors
Write-Host "`n--- Creating Vendors ---" -ForegroundColor Green
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

# Schedule Audit
Write-Host "`n--- Scheduling Audit ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

Add-WithRetry -Action {
    Invoke-TrpcPost "audit.scheduleAudit" @{
        clientId = $clientId
        frameworkId = 1
        title = "FISMA Annual Security Audit"
        type = "Federal"
        plannedDate = "2026-11-01"
        scope = "Annual Federal Information Security Modernization Act compliance audit"
        auditorEmail = "audit@ig.gov"
        auditorName = "Inspector General"
    }
} -Label "FISMA Audit"

Write-Host "`n=== FDSA RETRY COMPLETE ===" -ForegroundColor Cyan
