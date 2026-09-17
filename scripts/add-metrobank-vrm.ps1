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

$clientId = 12

Write-Host "=== Case Study 6: MetroBank VRM Implementation ===" -ForegroundColor Cyan

# Create 20 Vendors
Write-Host "`nCreating 20 Vendors for MetroBank..." -ForegroundColor Yellow
$vendors = @(
    @{ Name = "FinTech Payment Solutions"; Description = "Payment processing gateway provider"; Criticality = "Critical"; DataAccess = "Full PII + Financial"; Category = "Financial Services"; Website = "payfintech.com" },
    @{ Name = "CloudHost Pro"; Description = "Primary cloud infrastructure provider"; Criticality = "Critical"; DataAccess = "All customer data"; Category = "Cloud Services"; Website = "cloudhostpro.com" },
    @{ Name = "SecureAuth Ltd"; Description = "Multi-factor authentication provider"; Criticality = "Critical"; DataAccess = "Authentication data"; Category = "Security"; Website = "secureauth.io" },
    @{ Name = "DataVault Backup"; Description = "Offsite backup and disaster recovery"; Criticality = "High"; DataAccess = "Encrypted backups"; Category = "Data Management"; Website = "datavault-backup.com" },
    @{ Name = "Credit Bureau Services"; Description = "Credit scoring and verification"; Criticality = "High"; DataAccess = "Financial records"; Category = "Financial Services"; Website = "creditbureau.com" },
    @{ Name = "KYC Verify"; Description = "Know Your Customer identity verification"; Criticality = "High"; DataAccess = "Identity documents"; Category = "Compliance"; Website = "kycverify.com" },
    @{ Name = "Core Banking Systems"; Description = "Core banking platform vendor"; Criticality = "Critical"; DataAccess = "All banking data"; Category = "Banking Software"; Website = "corebanking.com" },
    @{ Name = "FraudWatch AI"; Description = "AI-powered fraud detection"; Criticality = "High"; DataAccess = "Transaction data"; Category = "Security"; Website = "fraudwatch.ai"; UsesAi = $true },
    @{ Name = "DocuSign Financial"; Description = "Electronic signature platform"; Criticality = "Medium"; DataAccess = "Signed documents"; Category = "Productivity"; Website = "docusign.com" },
    @{ Name = "CustomerComm"; Description = "Customer communication platform"; Criticality = "Medium"; DataAccess = "Contact details"; Category = "Marketing"; Website = "customercomm.com" },
    @{ Name = "RegTech Compliance"; Description = "Regulatory compliance monitoring"; Criticality = "High"; DataAccess = "Compliance data"; Category = "Compliance"; Website = "regtech.com" },
    @{ Name = "NetworkSecure"; Description = "Network security monitoring"; Criticality = "High"; DataAccess = "Network logs"; Category = "Security"; Website = "netsecure.com" },
    @{ Name = "HR Payroll Systems"; Description = "HR and payroll processing"; Criticality = "Medium"; DataAccess = "Employee PII"; Category = "HR"; Website = "hrpayroll.com" },
    @{ Name = "Office365 Enterprise"; Description = "Email and productivity suite"; Criticality = "Medium"; DataAccess = "Email, documents"; Category = "Productivity"; Website = "microsoft.com" },
    @{ Name = "ATM Network Services"; Description = "ATM network management"; Criticality = "High"; DataAccess = "Transaction data"; Category = "Banking Infrastructure"; Website = "atmnetwork.com" },
    @{ Name = "SWIFT Messaging"; Description = "International payment messaging"; Criticality = "Critical"; DataAccess = "Payment instructions"; Category = "Banking Infrastructure"; Website = "swift.com" },
    @{ Name = "PenTest Security"; Description = "Penetration testing services"; Criticality = "Medium"; DataAccess = "System access"; Category = "Security"; Website = "pentestsec.com" },
    @{ Name = "LegalEagle Docs"; Description = "Legal document management"; Criticality = "Low"; DataAccess = "Legal documents"; Category = "Legal"; Website = "legaleagle.com" },
    @{ Name = "TrainingHub"; Description = "Security awareness training"; Criticality = "Low"; DataAccess = "Employee records"; Category = "Training"; Website = "traininghub.com" },
    @{ Name = "DataAnalytics Pro"; Description = "Business intelligence and analytics"; Criticality = "Medium"; DataAccess = "Aggregated data"; Category = "Analytics"; Website = "dataanalyticspro.com"; UsesAi = $true }
)

$success = 0
$failed = 0

foreach ($v in $vendors) {
    $body = @{
        clientId = $clientId
        name = $v.Name
        description = $v.Description
        criticality = $v.Criticality
        dataAccess = $v.DataAccess
        category = $v.Category
        website = $v.Website
        status = "Active"
        reviewStatus = "needs_review"
    }
    if ($v.UsesAi) {
        $body.usesAi = $true
        $body.isAiService = $true
        $body.aiDataUsage = "Processes customer data for analytics"
    }
    
    $result = Invoke-TrpcPost -Path "vendorAssessments.createVendor" -Data $body
    
    if ($result.Success) {
        $id = ($result.Body | ConvertFrom-Json).result.data.json.id
        Write-Host "  Created: $($v.Name) (ID: $id) - $($v.Criticality)" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  FAILED: $($v.Name) - $($result.Body.Substring(0, [Math]::Min(80, $result.Body.Length)))" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=== Case Study 6 Complete ===" -ForegroundColor Cyan
Write-Host "Success: $success, Failed: $failed" -ForegroundColor White
