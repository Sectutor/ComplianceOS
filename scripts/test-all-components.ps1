Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Web

$baseUri = "http://127.0.0.1:3005/api/trpc"
$hc = New-Object System.Net.Http.HttpClient
$hc.Timeout = [TimeSpan]::FromSeconds(30)

$clients = @(15, 16, 17)
$clientNames = @("FDSA (Federal)", "EuroCloud (EU)", "NexGen AI")

Write-Output "========================================="
Write-Output "COMPLIANCE COMPONENTS TEST"
Write-Output "========================================="

$totalTests = 0
$passedTests = 0
$failedTests = 0

for ($i = 0; $i -lt $clients.Count; $i++) {
    $cid = $clients[$i]
    $name = $clientNames[$i]
    Write-Output "`n=== $name (Client $cid) ==="
    
    # ============================================
    # 1. GAP ANALYSIS
    # ============================================
    Write-Output "`n  --- Gap Analysis ---"
    
    # List gap analyses
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/gapAnalysis.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $items = $result.result.data.json
        $passedTests++
        Write-Output "    PASS: List gap analyses ($($items.Count) found)"
        $firstGapId = $items[0].id
    } catch {
        $failedTests++
        Write-Output "    FAIL: List gap analyses"
        $firstGapId = 0
    }
    
    # Get gap analysis details
    $totalTests++
    try {
        $json = @{ clientId = $cid; id = $firstGapId } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/gapAnalysis.get?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $item = $result.result.data.json
        $itemObj = if ($item.assessment) { $item.assessment } else { $item }
        if ($itemObj.id -eq $firstGapId) {
            $passedTests++
            Write-Output "    PASS: Get gap analysis details"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get gap analysis details - ID mismatch"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get gap analysis details"
    }
    
    # Get gap responses
    $totalTests++
    try {
        $json = @{ assessmentId = $firstGapId } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/gapAnalysis.getResponses?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $passedTests++
        Write-Output "    PASS: Get gap responses"
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get gap responses"
    }
    
    # ============================================
    # 2. RISK MANAGEMENT
    # ============================================
    Write-Output "`n  --- Risk Management ---"
    
    # List risks
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/risks.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $items = $result.result.data.json.items
        $passedTests++
        Write-Output "    PASS: List risks ($($items.Count) found)"
        $firstRiskId = $items[0].id
    } catch {
        $failedTests++
        Write-Output "    FAIL: List risks"
        $firstRiskId = 0
    }
    
    # Get risk details
    $totalTests++
    try {
        $json = @{ clientId = $cid; id = $firstRiskId } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/risks.get?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $item = $result.result.data.json
        if ($item.id -eq $firstRiskId) {
            $passedTests++
            Write-Output "    PASS: Get risk details"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get risk details - ID mismatch"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get risk details"
    }
    
    # Get KRI stats (replaces getDashboard)
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/risks.getKRIStats?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Get KRI stats"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get KRI stats"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get KRI stats"
    }
    
    # ============================================
    # 3. POLICY MANAGEMENT
    # ============================================
    Write-Output "`n  --- Policy Management ---"
    
    # List policies
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/clientPolicies.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $items = $result.result.data.json
        $passedTests++
        Write-Output "    PASS: List policies ($($items.Count) found)"
        $firstPolId = $items[0].id
    } catch {
        $failedTests++
        Write-Output "    FAIL: List policies"
        $firstPolId = 0
    }
    
    # Get policy details
    $totalTests++
    try {
        $json = @{ clientId = $cid; id = $firstPolId } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/clientPolicies.get?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $item = $result.result.data.json
        $itemObj = if ($item.clientPolicy) { $item.clientPolicy } else { $item }
        if ($itemObj.id -eq $firstPolId) {
            $passedTests++
            Write-Output "    PASS: Get policy details"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get policy details - ID mismatch"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get policy details"
    }
    
    # ============================================
    # 4. BUSINESS CONTINUITY
    # ============================================
    Write-Output "`n  --- Business Continuity ---"
    
    # Get BC dashboard
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/businessContinuity.getDashboardMetrics?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Get BC dashboard"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get BC dashboard"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get BC dashboard"
    }
    
    # List business processes
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/businessContinuity.processes.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $items = $result.result.data.json
        $passedTests++
        Write-Output "    PASS: List business processes ($($items.Count) found)"
        $firstProcId = $items[0].id
    } catch {
        $failedTests++
        Write-Output "    FAIL: List business processes"
        $firstProcId = 0
    }
    
    # Get process details
    $totalTests++
    try {
        $json = @{ clientId = $cid; id = $firstProcId } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/businessContinuity.processes.get?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $item = $result.result.data.json
        if ($item.id -eq $firstProcId) {
            $passedTests++
            Write-Output "    PASS: Get process details"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get process details - ID mismatch"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get process details"
    }
    
    # Get BC program
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/businessContinuity.program.get?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Get BC program"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get BC program"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get BC program"
    }
    
    # Get processes with BIA status
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/businessContinuity.processes.getProcessesWithBiaStatus?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Get processes with BIA status"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get processes with BIA status"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get processes with BIA status"
    }
    
    # ============================================
    # 5. VENDOR MANAGEMENT
    # ============================================
    Write-Output "`n  --- Vendor Management ---"
    
    # List vendors
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/vendorAssessments.listVendors?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $items = $result.result.data.json
        $passedTests++
        Write-Output "    PASS: List vendors ($($items.Count) found)"
        $firstVendId = $items[0].id
    } catch {
        $failedTests++
        Write-Output "    FAIL: List vendors"
        $firstVendId = 0
    }
    
    # Get vendor details
    $totalTests++
    try {
        $json = @{ clientId = $cid; vendorId = $firstVendId } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/vendorAssessments.getVendorDetails?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Get vendor details"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get vendor details"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get vendor details"
    }
    
    # ============================================
    # 6. AUDIT MANAGEMENT
    # ============================================
    Write-Output "`n  --- Audit Management ---"
    
    # List audits
    $totalTests++
    try {
        $json = @{ clientId = $cid } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/audit.list?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        $items = $result.result.data.json
        $passedTests++
        Write-Output "    PASS: List audits ($($items.Count) found)"
        $firstAudId = $items[0].id
    } catch {
        $failedTests++
        Write-Output "    FAIL: List audits"
        $firstAudId = 0
    }
    
    # Update audit status (tests write operation)
    $totalTests++
    try {
        $json = @{ auditId = $firstAudId; status = "scheduled" } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/audit.updateStatus?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Update audit status"
        } else {
            $failedTests++
            Write-Output "    FAIL: Update audit status"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Update audit status"
    }
    
    # Get audit readiness stats (needs planId + frameworkId)
    $totalTests++
    try {
        $json = @{ planId = 1; frameworkId = 1 } | ConvertTo-Json -Compress
        $input = [System.Web.HttpUtility]::UrlEncode($json)
        $url = "$baseUri/audit.getReadinessStats?input=$input"
        $body = $hc.GetAsync($url).Result.Content.ReadAsStringAsync().Result
        $result = $body | ConvertFrom-Json
        if ($result.result.data.json) {
            $passedTests++
            Write-Output "    PASS: Get audit readiness stats"
        } else {
            $failedTests++
            Write-Output "    FAIL: Get audit readiness stats"
        }
    } catch {
        $failedTests++
        Write-Output "    FAIL: Get audit readiness stats"
    }
}

Write-Output "`n========================================="
Write-Output "TEST RESULTS SUMMARY"
Write-Output "========================================="
Write-Output "Total Tests: $totalTests"
Write-Output "Passed: $passedTests"
Write-Output "Failed: $failedTests"
if ($totalTests -gt 0) {
    Write-Output "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 1))%"
}
Write-Output "========================================="
