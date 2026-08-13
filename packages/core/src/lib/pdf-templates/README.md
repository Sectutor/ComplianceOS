# Report Templates

This directory contains report template definitions for one-click report generation.

## Available Templates

| ID | Name | Category | Pages |
|----|------|----------|-------|
| executive-summary | Executive Summary | executive | 4 |
| soc2-readiness | SOC 2 Readiness Report | compliance | 12 |
| iso27001-assessment | ISO 27001 Readiness | compliance | 15 |
| nist-csf-scorecard | NIST CSF Scorecard | framework | 8 |
| risk-register-summary | Risk Register Summary | executive | 6 |
| evidence-gap-analysis | Evidence Gap Analysis | custom | 10 |
| vendor-risk-report | Vendor Risk Report | compliance | 8 |

## Adding New Templates

1. Add a new entry to the 	emplateRegistry array in index.ts
2. Implement the generate method using ReportBuilder from ../evidence-report-pipeline
3. The template will automatically appear in the Report Workshop UI