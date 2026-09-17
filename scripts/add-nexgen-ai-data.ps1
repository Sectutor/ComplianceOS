# Case Study 11: NexGen AI Systems Ltd. - AI Governance & Standards
# Client ID: 17
# Frameworks: ISO 27001 (95 controls) + SOC 2 (with AI-specific controls)

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

$clientId = 17
$successCount = 0
$failCount = 0

function Add-WithRetry {
    param([scriptblock]$Action, [string]$Label)
    $result = & $Action
    if ($result.Success) { $script:successCount++; Start-Sleep -Milliseconds 200 } else { $script:failCount++; Write-Host "FAIL: $Label"; Start-Sleep -Milliseconds 500 }
}

Write-Host "=== CASE STUDY 11: NEXGEN AI SYSTEMS LTD. ===" -ForegroundColor Cyan
Write-Host "Client ID: $clientId" -ForegroundColor Yellow

# ============================================
# STEP 1: Create ISO 27001 Gap Analysis (with AI focus)
# ============================================
Write-Host "`n--- Step 1: Creating ISO 27001 Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "NexGen AI ISO 27001 ISMS Gap Analysis"
    framework = "ISO 27001"
    scope = "All AI/ML development, training data management, model deployment, customer AI services, and supporting IT infrastructure"
}
Write-Host "ISO 27001 Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$isoGapId = 11

# ============================================
# STEP 2: Create SOC 2 Gap Analysis
# ============================================
Write-Host "`n--- Step 2: Creating SOC 2 Gap Analysis ---" -ForegroundColor Green
$result = Invoke-TrpcPost "gapAnalysis.create" @{
    clientId = $clientId
    name = "NexGen AI SOC 2 Type II Gap Analysis"
    framework = "SOC 2"
    scope = "AI platform services, customer data processing, system availability, and confidentiality controls"
}
Write-Host "SOC 2 Gap Analysis: $($result.Body.Substring(0, [Math]::Min(200, $result.Body.Length)))"
$soc2GapId = 12

# ============================================
# STEP 3: Add ISO 27001 Gap Responses (AI-specific)
# ============================================
Write-Host "`n--- Step 3: Adding ISO 27001 Gap Responses ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$isoControls = @(
    @{Id="A.5.1"; Current="implemented"; Target="implemented"; Notes="Information security policies include AI governance"},
    @{Id="A.5.2"; Current="implemented"; Target="implemented"; Notes="Management responsibilities for AI oversight assigned"},
    @{Id="A.5.3"; Current="partially_implemented"; Target="implemented"; Notes="AI governance roles need formal definition"},
    @{Id="A.5.4"; Current="implemented"; Target="implemented"; Notes="AI management responsibility established"},
    @{Id="A.5.5"; Current="partially_implemented"; Target="implemented"; Notes="Contact with AI regulatory authorities needed"},
    @{Id="A.5.6"; Current="implemented"; Target="implemented"; Notes="Contact with AI ethics groups established"},
    @{Id="A.5.7"; Current="partially_implemented"; Target="implemented"; Notes="AI threat intelligence needs enhancement"},
    @{Id="A.5.8"; Current="implemented"; Target="implemented"; Notes="Security in AI project management established"},
    @{Id="A.5.9"; Current="partially_implemented"; Target="implemented"; Notes="AI asset inventory needs automation"},
    @{Id="A.5.10"; Current="implemented"; Target="implemented"; Notes="Acceptable use of AI resources documented"},
    @{Id="A.5.11"; Current="implemented"; Target="implemented"; Notes="Return of AI assets procedure established"},
    @{Id="A.5.12"; Current="partially_implemented"; Target="implemented"; Notes="AI data classification needs ML-specific categories"},
    @{Id="A.5.13"; Current="implemented"; Target="implemented"; Notes="AI data labeling per governance standards"},
    @{Id="A.5.14"; Current="partially_implemented"; Target="implemented"; Notes="AI data transfer needs model protection"},
    @{Id="A.5.15"; Current="implemented"; Target="implemented"; Notes="AI access control policy documented"},
    @{Id="A.5.16"; Current="partially_implemented"; Target="implemented"; Notes="AI identity management needs MLOps integration"},
    @{Id="A.5.17"; Current="implemented"; Target="implemented"; Notes="AI authentication information management established"},
    @{Id="A.5.18"; Current="partially_implemented"; Target="implemented"; Notes="AI access rights review needs automation"},
    @{Id="A.5.19"; Current="implemented"; Target="implemented"; Notes="AI supplier relationships security established"},
    @{Id="A.5.20"; Current="partially_implemented"; Target="implemented"; Notes="AI supplier agreements need model governance clauses"},
    @{Id="A.5.21"; Current="implemented"; Target="implemented"; Notes="AI supplier monitoring established"},
    @{Id="A.5.22"; Current="partially_implemented"; Target="implemented"; Notes="AI change management needs model versioning"},
    @{Id="A.5.23"; Current="implemented"; Target="implemented"; Notes="AI cloud service security established"},
    @{Id="A.5.24"; Current="partially_implemented"; Target="implemented"; Notes="AI incident response needs model-specific procedures"},
    @{Id="A.5.25"; Current="implemented"; Target="implemented"; Notes="AI assessment decisions documented"},
    @{Id="A.5.26"; Current="partially_implemented"; Target="implemented"; Notes="AI incident response plan needs adversarial attack procedures"},
    @{Id="A.5.27"; Current="implemented"; Target="implemented"; Notes="AI evidence collection procedures established"},
    @{Id="A.5.28"; Current="partially_implemented"; Target="implemented"; Notes="AI business continuity integration needed"}
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
# STEP 4: Add SOC 2 Gap Responses
# ============================================
Write-Host "`n--- Step 4: Adding SOC 2 Gap Responses ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$soc2Controls = @(
    @{Id="CC1.1"; Current="implemented"; Target="implemented"; Notes="Control environment includes AI governance oversight"},
    @{Id="CC1.2"; Current="partially_implemented"; Target="implemented"; Notes="AI ethics board needs formal establishment"},
    @{Id="CC1.3"; Current="implemented"; Target="implemented"; Notes="AI management responsibility assigned"},
    @{Id="CC1.4"; Current="partially_implemented"; Target="implemented"; Notes="AI personnel screening needs enhancement"},
    @{Id="CC2.1"; Current="implemented"; Target="implemented"; Notes="AI internal communication channels established"},
    @{Id="CC2.2"; Current="partially_implemented"; Target="implemented"; Notes="AI external communication needs governance"},
    @{Id="CC3.1"; Current="implemented"; Target="implemented"; Notes="AI risk assessment methodology established"},
    @{Id="CC3.2"; Current="partially_implemented"; Target="implemented"; Notes="AI risk assessment needs model-specific risks"},
    @{Id="CC3.3"; Current="implemented"; Target="implemented"; Notes="AI control activities defined"},
    @{Id="CC3.4"; Current="partially_implemented"; Target="implemented"; Notes="AI control communication needs formalization"},
    @{Id="CC4.1"; Current="implemented"; Target="implemented"; Notes="AI information quality for decisions established"},
    @{Id="CC4.2"; Current="partially_implemented"; Target="implemented"; Notes="AI internal information needs MLOps integration"},
    @{Id="CC5.1"; Current="implemented"; Target="implemented"; Notes="AI control procedures documented"},
    @{Id="CC5.2"; Current="partially_implemented"; Target="implemented"; Notes="AI control implementation needs automation"},
    @{Id="CC5.3"; Current="implemented"; Target="implemented"; Notes="AI control accountability established"},
    @{Id="CC6.1"; Current="implemented"; Target="implemented"; Notes="AI logical access controls implemented"},
    @{Id="CC6.2"; Current="partially_implemented"; Target="implemented"; Notes="AI access provisioning needs MLOps integration"},
    @{Id="CC6.3"; Current="implemented"; Target="implemented"; Notes="AI access removal procedures established"},
    @{Id="CC7.1"; Current="implemented"; Target="implemented"; Notes="AI system monitoring established"},
    @{Id="CC7.2"; Current="partially_implemented"; Target="implemented"; Notes="AI monitoring procedures need model drift detection"},
    @{Id="CC8.1"; Current="implemented"; Target="implemented"; Notes="AI incident response procedures established"},
    @{Id="CC9.1"; Current="partially_implemented"; Target="implemented"; Notes="AI vendor management needs model governance"},
    @{Id="A1.1"; Current="implemented"; Target="implemented"; Notes="AI capacity planning established"},
    @{Id="A1.2"; Current="partially_implemented"; Target="implemented"; Notes="AI backup and recovery needs model checkpointing"},
    @{Id="C1.1"; Current="implemented"; Target="implemented"; Notes="AI data confidentiality controls established"},
    @{Id="C1.2"; Current="partially_implemented"; Target="implemented"; Notes="AI data encryption needs model protection"},
    @{Id="PI1.1"; Current="implemented"; Target="implemented"; Notes="AI processing integrity controls established"},
    @{Id="PI1.2"; Current="partially_implemented"; Target="implemented"; Notes="AI processing monitoring needs model validation"}
)

foreach ($ctrl in $soc2Controls) {
    Add-WithRetry -Action {
        Invoke-TrpcPost "gapAnalysis.updateResponse" @{
            assessmentId = $soc2GapId
            controlId = $ctrl.Id
            currentStatus = $ctrl.Current
            targetStatus = $ctrl.Target
            notes = $ctrl.Notes
        }
    } -Label $ctrl.Id
}

Write-Host "SOC 2 Gap Responses: $successCount success, $failCount failed"

# ============================================
# STEP 5: Create AI-Specific Risk Assessments
# ============================================
Write-Host "`n--- Step 5: Creating AI Risk Assessments ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiRisks = @(
    @{Title="AI model bias and discrimination"; Category="AI Ethics"; Likelihood=3; Impact=5; Treatment="mitigate"},
    @{Title="Adversarial attack on ML models"; Category="AI Security"; Likelihood=4; Impact=5; Treatment="mitigate"},
    @{Title="Training data poisoning"; Category="AI Security"; Likelihood=3; Impact=5; Treatment="mitigate"},
    @{Title="AI model intellectual property theft"; Category="IP Protection"; Likelihood=3; Impact=4; Treatment="mitigate"},
    @{Title="AI regulatory non-compliance"; Category="Compliance"; Likelihood=3; Impact=5; Treatment="mitigate"},
    @{Title="AI model drift and degradation"; Category="AI Operations"; Likelihood=4; Impact=4; Treatment="mitigate"},
    @{Title="AI supply chain compromise"; Category="Supply Chain"; Likelihood=2; Impact=5; Treatment="transfer"},
    @{Title="AI privacy violation via training data"; Category="Privacy"; Likelihood=3; Impact=5; Treatment="mitigate"},
    @{Title="AI explainability failure"; Category="AI Governance"; Likelihood=3; Impact=4; Treatment="mitigate"},
    @{Title="AI vendor lock-in"; Category="Supply Chain"; Likelihood=3; Impact=3; Treatment="accept"},
    @{Title="AI compute resource exhaustion"; Category="Availability"; Likelihood=3; Impact=4; Treatment="mitigate"},
    @{Title="AI safety incident"; Category="AI Safety"; Likelihood=2; Impact=5; Treatment="mitigate"}
)

foreach ($risk in $aiRisks) {
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
# STEP 6: Create AI-Specific Policies
# ============================================
Write-Host "`n--- Step 6: Creating AI Policies ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiPolicies = @(
    @{Name="AI Governance and Ethics Policy"; Module="general"; Status="approved"},
    @{Name="AI Model Development Lifecycle Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Training Data Management Policy"; Module="privacy"; Status="approved"},
    @{Name="AI Model Security and Protection Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Bias and Fairness Policy"; Module="general"; Status="approved"},
    @{Name="AI Explainability and Transparency Policy"; Module="general"; Status="approved"},
    @{Name="AI Risk Management Policy"; Module="general"; Status="approved"},
    @{Name="AI Incident Response Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Vendor and Supply Chain Policy"; Module="general"; Status="approved"},
    @{Name="AI Intellectual Property Policy"; Module="general"; Status="approved"},
    @{Name="AI Privacy and Data Protection Policy"; Module="privacy"; Status="approved"},
    @{Name="AI Safety and Alignment Policy"; Module="general"; Status="approved"},
    @{Name="AI Testing and Validation Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Monitoring and Drift Detection Policy"; Module="cyber"; Status="approved"},
    @{Name="AI Business Continuity Policy"; Module="general"; Status="approved"},
    @{Name="AI Regulatory Compliance Policy"; Module="general"; Status="approved"}
)

foreach ($policy in $aiPolicies) {
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
# STEP 7: Create BCP Project
# ============================================
Write-Host "`n--- Step 7: Creating BCP Program ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

Add-WithRetry -Action {
    Invoke-TrpcPost "businessContinuity.program.upsert" @{
        clientId = $clientId
        programName = "NexGen AI Business Continuity Program"
        scopeDescription = "All AI model training, inference services, data pipelines, and customer AI applications"
        policyStatement = "NexGen AI maintains critical AI services during disruptive incidents to ensure customer trust and safety"
        budgetAllocated = "150000"
        status = "active"
    }
} -Label "BCP Program"

# ============================================
# STEP 8: Create Business Processes
# ============================================
Write-Host "`n--- Step 8: Creating Business Processes ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiProcesses = @(
    @{Name="AI Model Training Pipeline"; Department="ML Engineering"; Criticality="Critical"; RTO="30 minutes"; RPO="0 minutes"},
    @{Name="AI Inference Services"; Department="Platform"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="Data Ingestion and Processing"; Department="Data Engineering"; Criticality="Critical"; RTO="1 hour"; RPO="15 minutes"},
    @{Name="Model Deployment and Serving"; Department="MLOps"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="AI Safety and Alignment Testing"; Department="AI Safety"; Criticality="High"; RTO="4 hours"; RPO="1 hour"},
    @{Name="Customer AI API Services"; Department="Engineering"; Criticality="Critical"; RTO="15 minutes"; RPO="0 minutes"},
    @{Name="AI Research and Development"; Department="Research"; Criticality="Medium"; RTO="8 hours"; RPO="4 hours"},
    @{Name="AI Ethics Review Process"; Department="Governance"; Criticality="High"; RTO="24 hours"; RPO="8 hours"}
)

foreach ($proc in $aiProcesses) {
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
# STEP 9: Create Vendors
# ============================================
Write-Host "`n--- Step 9: Creating AI Vendors ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

$aiVendors = @(
    @{Name="GPUCloud Compute"; Category="AI Compute Infrastructure"; Criticality="Critical"; DataAccess="Sensitive"},
    @{Name="SecureML Platform"; Category="ML Platform Services"; Criticality="Critical"; DataAccess="PII"},
    @{Name="AI Data Provider Ltd"; Category="Training Data"; Criticality="High"; DataAccess="PII"},
    @{Name="ModelAudit AI"; Category="AI Compliance Audit"; Criticality="High"; DataAccess="Sensitive"},
    @{Name="CloudAI Services"; Category="Cloud AI Services"; Criticality="Critical"; DataAccess="PII"},
    @{Name="AI Safety Institute"; Category="AI Safety Consulting"; Criticality="Medium"; DataAccess="Internal"},
    @{Name="DataLabel Pro"; Category="Data Annotation"; Criticality="Medium"; DataAccess="PII"},
    @{Name="AIEthics Review Board"; Category="AI Ethics"; Criticality="Medium"; DataAccess="Internal"}
)

foreach ($vendor in $aiVendors) {
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
# STEP 10: Schedule Audit
# ============================================
Write-Host "`n--- Step 10: Scheduling AI Audit ---" -ForegroundColor Green
$successCount = 0
$failCount = 0

Add-WithRetry -Action {
    Invoke-TrpcPost "audit.scheduleAudit" @{
        clientId = $clientId
        frameworkId = 1
        title = "AI Governance and Security Audit"
        type = "External"
        plannedDate = "2026-12-15"
        scope = "Comprehensive AI governance, security, ethics, and compliance audit"
        auditorEmail = "audit@ai-governance-auditors.com"
        auditorName = "AI Governance Auditor"
    }
} -Label "AI Audit"

Write-Host "`n=== NEXGEN AI CASE STUDY COMPLETE ===" -ForegroundColor Cyan
