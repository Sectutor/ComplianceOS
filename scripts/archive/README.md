# Archived Debug Scripts

Moved from project root to `scripts/archive/` on 2026-06-23.

## Summary

Cleaned up ~350+ debug scripts, log files, and temporary files from the project root directory.
All files remain available here and can be restored or referenced as needed.

## Categories of files moved

### Debug/Check Scripts (check_*)
check_assessment.js, check_client.ts, check_client_3.ts, check_client_data.ts, check_client_data_v2.ts, check_client_frameworks.js, check_client3_data.cjs, check_cols.js, check_controls.js, check_controls_temp.cjs, check_counts.ts, check_creds.ts, check_db.ts, check_db_data.ts, check_db_integrations.ts, check_db_properly.ts, check_db_reqs.ts, check_db_simple.js, check_debug_data.ts, check_e8.ts, check_emmanuel.ts, check_env_load.ts, check_evidence_cols.ts, check_findings_col.ts, check_fisma_cols.ts, check_frameworks.ts, check_gdpr_plans.ts, check_iso.ts, check_last.ts, check_llm_keys.js, check_llm_rules.ts, check_local_db.ts, check_memberships.ts, check_new_columns.ts, check_nist_table.ts, check_overdue.ts, check_owners.ts, check_pdf.ts, check_providers.ts, check_query.ts, check_readiness.ts, check_report_debug.ts, check_risks_v8.ts, check_role.js, check_role.ts, check_ropa_data.ts, check_schema.cjs, check_slack_id.ts, check_table.cjs, check_table.ts, check_tags.py, check_tags_v2.py, check_templates.ts, check_tier.ts, check_user.ts, check_users_col.ts, check_vendors.ts, checkBothTables.cjs, check-clients.ts, check-db.ts, check-dsar-table.ts, check-risk-178.ts, checkRoadmap2.cjs, checkRoadmap5Data.cjs, checkRoadmapData.cjs, check-training-table.ts

### Test Scripts (test_*)
test_ai.ts, test_api_error.js, test_baseline.ts, test_caller.ts, test_client_controls.js, test_conn.js, test_create_policy.ts, test_db.js, test_db.ts, test_deepseek.ts, test_dpa_create.ts, test_email_dispatch.ts, test_fetch.js, test_import.ts, test_import_integrations.ts, test_mutation.ts, test_pg.ts, test_report.ts, test_schema.ts, test_schema_load.ts, test_soa.ts, test_supabase_conn.ts, test_trpc.ts, test_trpc_procedures.ts, test_vulnerability_scanner.ts, test-audit-bundle.ts, test-direct-update.ts, test-env.ts, test-schema.ts, test-schema-simple.ts, test-supabase.ts, test-trpc-training.ts, test-update.ts, testRoadmapsAPI.cjs, testTRPCAPI.cjs

### Debug/Diagnose/Verify/Fix Scripts
debug_crm_data.ts, debug_exceptions.ts, debug_raci_data.ts, debug_routers.py, debug_vendor_db.ts, debug_xls.cjs, debug_xls.js, debug_xls.ts, diagnose_db.ts, diagnose_delete.ts, diagnose_users.ts, diagnose_users_v2.ts, verify_ai_suggestions.ts, verify_all.ts, verify_all_cols.ts, verify_columns.ts, verify_counts.ts, verify_custom_control.ts, verify_db.ts, verify_db_members.ts, verify_email_system.ts, verify_framework_fix.ts, verify_mitigation_linking.ts, verify_notification.ts, verify_notification_placeholder.ts, verify_pdf_parse.ts, verify_policy_integration.ts, verifyRoadmap5.cjs, fix_evidence_db.ts, fix_framework_names.cjs, fix_gdpr_visibility.ts, fix_llm_keys.js, fix_llm_priority.ts, fix_login.ts, fix_mfa_column.ts, fix_redirect.ts, fix_redirect_v2.ts, fix_routers.js, fix_schema.py, fix_vendors_db.ts, fix-dashboard-colors.cjs, fix-dashboard-colors.js

### Schema/Migration Scripts
add_column.ts, add_cui_federal_contracts.ts, add_extra_fields_column.ts, add_fips_rationale.ts, add_fisma_system_id.ts, add_framework_mapping_columns.ts, add_question_id_column.ts, add_questionnaire_columns.ts, add_questionnaire_direction.ts, add_questionnaire_focus_columns.ts, add_questionnaire_vendor_columns.ts, add_samm_column.cjs, alter_risk_scenarios.ts, alter_schema.ts, apply_kb_migration.ts, apply_migrations.ts, apply_pa_migration.ts, apply_questionnaire_migration.ts, apply_sql_fix.js, apply_tailoring_migration.ts, seed_data.ts, seed_data_inventory.ts, seed_email_templates.ts, seed_fips199.ts, seed_framework_mappings.ts, seed_gdpr_plan.ts, seed_gdpr_tasks.ts, seed_learning_content.ts, seed_nis2_mappings.ts, seed_nist_complete.cjs, seed_nist_csf.ts, seed_nist_fixed.cjs, seed_remaining.cjs, seed_tasks.ts, seed_v2.ts, seedComplianceSimulation.ts, seedPrivacyData.ts, seed-risk-data.sql, migrate_client_settings.ts, migrate_e8.ts, migrate_maturity.ts, migrate_threat_asset_mappings.ts, migrate-report-logs.ts, manual-migration.ts, create_breaches_table.ts, create_license_tables.ts, create_nis2_demo.ts, create_overdue.ts, create_table_v2.ts, create_triggers_table.ts

### List/Inspect/Analyze Scripts
list_all_tables.ts, list_auth_users.ts, list_clients.ts, list_procedures.ts, list_schema.py, list_tables.js, list_tables.ts, list_vendor_cols.ts, analyze_routers.ts, audit_visibility.ts

### Log Files
auth_debug.log, auth_error.log, dev_startup_1.log, error.log, frontend_dev.log, frontend_dev_2.log, import_debug.log, server.log, server_clean_startup.log, server_clean_startup_2.log, server_clean_startup_3.log, server_clean_startup_charts.log, server_clean_startup_delete_feature.log, server_clean_startup_final.log, server_clean_startup_final_2.log, server_clean_startup_fix_markdown.log, server_clean_startup_status_feature.log, server_debug.log, server_debug_fresh.log, server_debug_v2.log, server_debug_v3.log, server_debug_v4.log, server_debug_v5.log, server_debug_v6.log, server_debug_v7.log, server_debug_v8.log, server_final_check.log, server_final_fix.log, server_fixed.log, server_fresh_startup.log, server_fresh_startup_2.log, server_fresh_startup_3.log, server_fresh_startup_4.log, server_fresh_startup_5.log, server_fresh_startup_6.log, server_fresh_startup_7.log, server_manual.log, server_manual_restart.log, server_manual_v2.log, server_pagebreak_fix.log, server_professional_chart.log, server_reverted.log, server_save_report_fix.log, server_startup.log, server_startup_10.log, server_startup_2.log, server_startup_3.log, server_startup_4.log, server_startup_5.log, server_startup_6.log, server_startup_7.log, server_startup_8.log, server_startup_9.log, server_startup_final.log, test_api.log, test_output.log, test_output_2.log, test_output_3.log, test_output_4.log, test_t66.log, time_temp.log, trpc_debug.log, verification.log, view_console_2025-12-16_09-49-34_247.log

### Output/Dump Files
client_1_check.txt, client_verification.txt, div_locations.txt, div_map.txt, enisa_excel_mappings.txt, enisa_results.txt, funcs.txt, llm_debug_output.txt, llm_debug_output_2.txt, llm_debug_output_3.txt, llm_debug_output_4.txt, llm_debug_output_5.txt, llm_debug_output_6.txt, old_files.txt, procedures.json, providers_dump.txt, providers_dump_v2.txt, providers_dump_v3.txt, p1.json, p2.json, query_result.txt, router_test_output.txt, schema_tables.txt, search_results.txt, server_error.txt, stderr_dump.txt, stdout_dump.txt, test_output.txt, trpc_resp.json, tsc_out.txt, temp_t66.txt, temp_timestamps.txt

### Dashboard/Rewrite/Revert Scripts
patch_assets_page.cjs, rewrite-dashboard.cjs, rewrite-risk-hub.cjs, rewrite-risk-hub-actual.cjs, revert-dashboard-light.cjs, revert-dashboard-light2.cjs, revert-dashboard-light3.cjs, fix-dashboard-colors.cjs, fix-dashboard-colors.js

### Python Scripts
append_db.py, append_plan.py, append_tasks.py, cleanup_files.py, debug_routers.py, extract_by_lines.py, extract_enisa.py, extract_enisa_v2.py, extract_enisa_v3.py, extract_excel.py, extract_policies.py, extract_router_v3.py, extract_router_v4.py, find_dupes.py, find_line.py, find_tables.py, refactor_routers_v2.py, smart_fix_schema.py, truncate_db.py

### Other Debug/Utility Scripts
count_evidence.ts, createTestData.js, createTestDataClean.cjs, createTestDataDirect.cjs, createTestDataFinal.cjs, createTestDataSimple.cjs, createTestDataSimpleDirect.cjs, delete-duplicates.ts, demo_architecture.json, direct_check_db.js, dump-risks.ts, find_asvs_files_v2.ts, inspect_risk_table.ts, nuke_and_seed.ts, patch_assets_page.cjs, populateRoadmap5.cjs, promote_admin.ts, recover_data.ts, repair_iso_controls.ts, run_seed.cjs, run_seed.ts, schema_snippet.ts, sendgrid.env, setup_fips199.ts, setup_nist_table.cjs, temp_wizard_old.tsx, temp_wizard_old_v3.tsx, temp_wizard_safe.tsx, test_email_preview.html, tmp_create_table.ts

### Temp Directories
- tmp_dir/ : Contains additional debug scripts from the root tmp/ directory
- tmp_empty/ : Previously empty tmp_empty/ directory
- dash-p_dir/ : Previously empty -p/ directory

## Files NOT moved (kept at root)

Application source: addon-init.ts, db.ts, env-loader.ts, index.ts, routers.ts, server_entry.ts, server-enterprise.ts, emailNotification.ts, policyExport.ts, policyZipExport.ts, read_report.ts

Configuration: package.json, package-lock.json, tsconfig.json, drizzle.config.ts, drizzle.license.config.ts, playwright.config.ts, vitest.config.ts, netlify.toml, vercel.json, netlify-update.json, Dockerfile, Dockerfile.selfhost, docker-compose.yml, docker-compose.selfhost.yml

Environment: .env, .env.example, .env.local, .env.scalability, .gitignore, .dockerignore, .eslintrc.cjs, .mise.toml, .npmrc, .vercelignore

Documentation: README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, LICENSE-COMMERCIAL.md, NOTICE.md, all *.md marketing/plan files

Test files: bulkAssign.test.ts, bulkPolicies.test.ts, calendar.test.ts, complianceReport.test.ts, contactInfo.test.ts, controlNotes.test.ts, controlPolicyIntegration.test.ts, controls.test.ts, dashboard.test.ts, evidenceFiles.test.ts, logoUpload.test.ts, onboarding.test.ts, policyExport.test.ts, policyExportProfessional.test.ts, policyZipExport.test.ts, raci.test.ts, search.test.ts, targetScore.test.ts

Other: index.css.backup
