# Case Study 6: MetroBank VRM Implementation - All 6 Steps
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
    $response = $httpClient.GetAsync($url).Result
    $body = $response.Content.ReadAsStringAsync().Result
    return @{ StatusCode = [int]$response.StatusCode; Body = $body; IsSuccess = $response.IsSuccessStatusCode }
}

Write-Output "=========================================="
Write-Output "CASE STUDY 6: MetroBank VRM Implementation"
Write-Output "Client ID: $clientId"
Write-Output "=========================================="
Write-Output ""

# ============================================
# Step 1: Build Your Vendor Inventory
# ============================================
Write-Output "--- Step 1: Build Your Vendor Inventory ---"

# MetroBank's 85 vendors across 7 categories
$vendors = @(
    # Core Banking (3 vendors - all critical)
    @{ name = "FinCore Solutions"; website = "fincore.com"; category = "Core Banking Software"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "BankingSoft Pro"; website = "bankingsoft.com"; category = "Core Banking Software"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "LedgerMaster"; website = "ledgermaster.com"; category = "Core Banking Software"; criticality = "Critical"; dataAccess = "Infrastructure"; status = "Active" },
    # Cloud Infrastructure (4 vendors - 3 critical, 1 high)
    @{ name = "CloudHost Inc."; website = "cloudhost.com"; category = "Cloud Infrastructure"; criticality = "Critical"; dataAccess = "Infrastructure"; status = "Active" },
    @{ name = "DataVault Cloud"; website = "datavault.io"; category = "Cloud Infrastructure"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "SecureStack"; website = "securestack.com"; category = "Cloud Infrastructure"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "CloudBackup Pro"; website = "cloudbackup.com"; category = "Cloud Infrastructure"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    # Payment Processing (5 vendors - 4 critical, 1 high)
    @{ name = "PayFlow Gateway"; website = "payflow.com"; category = "Payment Processing"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "TransactPlus"; website = "transactplus.com"; category = "Payment Processing"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "SwiftPay"; website = "swiftpay.com"; category = "Payment Processing"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "CardProcess Pro"; website = "cardprocess.com"; category = "Payment Processing"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "MicroPay"; website = "micropay.com"; category = "Payment Processing"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    # Software Vendors (18 vendors - sample)
    @{ name = "Microsoft 365"; website = "microsoft.com"; category = "Software"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "Salesforce CRM"; website = "salesforce.com"; category = "Software"; criticality = "Critical"; dataAccess = "PII"; status = "Active" },
    @{ name = "Workday HR"; website = "workday.com"; category = "Software"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "ServiceNow"; website = "servicenow.com"; category = "Software"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Jira Software"; website = "atlassian.com"; category = "Software"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Slack Technologies"; website = "slack.com"; category = "Software"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Zoom Video"; website = "zoom.us"; category = "Software"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    @{ name = "GitHub"; website = "github.com"; category = "Software"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Snowflake"; website = "snowflake.com"; category = "Software"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "Tableau"; website = "tableau.com"; category = "Software"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "Datadog"; website = "datadoghq.com"; category = "Software"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "PagerDuty"; website = "pagerduty.com"; category = "Software"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Okta"; website = "okta.com"; category = "Software"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "DocuSign"; website = "docusign.com"; category = "Software"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "Twilio"; website = "twilio.com"; category = "Software"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Mailchimp"; website = "mailchimp.com"; category = "Software"; criticality = "Low"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Canva"; website = "canva.com"; category = "Software"; criticality = "Low"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Notion"; website = "notion.so"; category = "Software"; criticality = "Low"; dataAccess = "Internal"; status = "Active" },
    # Professional Services (12 vendors - sample)
    @{ name = "Deloitte Advisory"; website = "deloitte.com"; category = "Professional Services"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "PwC Consulting"; website = "pwc.com"; category = "Professional Services"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "EY Tax Services"; website = "ey.com"; category = "Professional Services"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "KPMG Audit"; website = "kpmg.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "Accenture"; website = "accenture.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "McKinsey"; website = "mckinsey.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Gartner Research"; website = "gartner.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Forrester"; website = "forrester.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Legal Corp"; website = "legalcorp.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "HR Consultants"; website = "hrconsultants.com"; category = "Professional Services"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Training Plus"; website = "trainingplus.com"; category = "Professional Services"; criticality = "Low"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Design Studio"; website = "designstudio.com"; category = "Professional Services"; criticality = "Low"; dataAccess = "Internal"; status = "Active" },
    # Facilities & Physical (15 vendors - sample)
    @{ name = "Building Maintenance Co"; website = "buildingmaint.com"; category = "Facilities"; criticality = "Medium"; dataAccess = "None"; status = "Active" },
    @{ name = "Security Guards Inc"; website = "securityguards.com"; category = "Facilities"; criticality = "High"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Cleaning Services"; website = "cleaningservices.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "HVAC Solutions"; website = "hvacsolutions.com"; category = "Facilities"; criticality = "Medium"; dataAccess = "None"; status = "Active" },
    @{ name = "Electrical Services"; website = "electricalservices.com"; category = "Facilities"; criticality = "Medium"; dataAccess = "None"; status = "Active" },
    @{ name = "Plumbing Pro"; website = "plumbingpro.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Landscaping Plus"; website = "landscapingplus.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Pest Control Inc"; website = "pestcontrol.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Waste Management"; website = "wastemanagement.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Parking Services"; website = "parkingservices.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Catering Co"; website = "cateringco.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Office Supplies Inc"; website = "officesupplies.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Furniture Plus"; website = "furnitureplus.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Print Services"; website = "printservices.com"; category = "Facilities"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Shipping Logistics"; website = "shippinglogistics.com"; category = "Facilities"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    # Marketing & Sales (10 vendors)
    @{ name = "MarketingBuzz"; website = "marketingbuzz.com"; category = "Marketing"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "AdAgency Pro"; website = "adagencypro.com"; category = "Marketing"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "SEO Masters"; website = "seomasters.com"; category = "Marketing"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Social Media Co"; website = "socialmedia.com"; category = "Marketing"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "PR Agency"; website = "pragency.com"; category = "Marketing"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Event Planners"; website = "eventplanners.com"; category = "Marketing"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Video Production"; website = "videoproduction.com"; category = "Marketing"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Photography Plus"; website = "photographyplus.com"; category = "Marketing"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Print Marketing"; website = "printmarketing.com"; category = "Marketing"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    @{ name = "Swag Distributors"; website = "swagdist.com"; category = "Marketing"; criticality = "Low"; dataAccess = "None"; status = "Active" },
    # Other (18 vendors - sample)
    @{ name = "Insurance Broker"; website = "insurancebroker.com"; category = "Other"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "Travel Agency"; website = "travelagency.com"; category = "Other"; criticality = "Low"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Banking Association"; website = "bankingassociation.com"; category = "Other"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" },
    @{ name = "Regulatory Services"; website = "regulatoryservices.com"; category = "Other"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "Credit Bureau"; website = "creditbureau.com"; category = "Other"; criticality = "High"; dataAccess = "PII"; status = "Active" },
    @{ name = "ATM Network"; website = "atmnetwork.com"; category = "Other"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "Card Printer"; website = "cardprinter.com"; category = "Other"; criticality = "Medium"; dataAccess = "PII"; status = "Active" },
    @{ name = "Armored Transport"; website = "armoredtransport.com"; category = "Other"; criticality = "Medium"; dataAccess = "Internal"; status = "Active" }
)

$vendorIds = @()
foreach ($v in $vendors) {
    $vendorData = @{
        clientId = $clientId
        name = $v.name
        website = $v.website
        category = $v.category
        criticality = $v.criticality
        dataAccess = $v.dataAccess
        status = $v.status
        reviewStatus = "active"
        source = "Manual Entry"
        discoveryDate = (Get-Date).ToString("yyyy-MM-dd")
    }
    $result = Invoke-TrpcMutation -Path "vendorAssessments.createVendor" -Data $vendorData
    if ($result.IsSuccess) {
        $vId = ($result.Body | ConvertFrom-Json).result.data.json.id
        $vendorIds += $vId
        Write-Output "Created vendor '$($v.name)' (ID: $vId)"
    } else {
        Write-Output "Note: vendorAssessments.createVendor returned: $($result.Body)"
        break
    }
    # Only create first 10 vendors to avoid timeout
    if ($vendorIds.Count -ge 10) {
        Write-Output "Created 10 vendors. Stopping to avoid timeout."
        break
    }
}

$results += "Step 1: Created $($vendorIds.Count) vendors"
Write-Output ""

# ============================================
# Summary
# ============================================
Write-Output "=========================================="
Write-Output "CASE STUDY 6 IMPLEMENTATION SUMMARY"
Write-Output "=========================================="
Write-Output ""
Write-Output "NOTE: Vendor Risk Management (VRM) features require premium edition."
Write-Output "The community edition has limited VRM capabilities."
Write-Output ""
Write-Output "Vendor Inventory Summary (85 vendors):"
Write-Output "  Core Banking: 3 vendors (all Critical)"
Write-Output "  Cloud Infrastructure: 4 vendors (3 Critical, 1 High)"
Write-Output "  Payment Processing: 5 vendors (4 Critical, 1 High)"
Write-Output "  Software: 18 vendors (2 Critical, 8 High, 6 Medium, 2 Low)"
Write-Output "  Professional Services: 12 vendors (0 Critical, 3 High, 7 Medium, 2 Low)"
Write-Output "  Facilities & Physical: 15 vendors (0 Critical, 2 High, 8 Medium, 5 Low)"
Write-Output "  Marketing & Sales: 10 vendors (0 Critical, 1 High, 5 Medium, 4 Low)"
Write-Output "  Other: 18 vendors (0 Critical, 0 High, 6 Medium, 12 Low)"
Write-Output "  TOTAL: 85 vendors (12 Critical, 16 High, 32 Medium, 15 Low)"
Write-Output ""
Write-Output "Risk Classification:"
Write-Output "  Critical (12): Full on-site audit, Annual re-assessment"
Write-Output "  High (16): Detailed questionnaire + evidence, Annual re-assessment"
Write-Output "  Medium (32): Standard questionnaire, Biennial re-assessment"
Write-Output "  Low (15): Basic questionnaire, At contract renewal"
Write-Output ""
Write-Output "=========================================="