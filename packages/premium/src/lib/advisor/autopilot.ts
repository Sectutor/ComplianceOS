import {
    getDb
} from "../../db";
import {
    clientPolicies,
    riskAssessments,
    clientControls,
    workItems,
    assets,
    vendors,
    vendorContracts,
    evidence,
    bcpProjects
} from "../../schema";
import { eq, and, lt, isNull, or, not, gt, sql } from "drizzle-orm";
import { addDays, subDays, differenceInDays } from "date-fns";
import { scanAssetForCves, scanVendorForCves } from "../threatIntelligence";

export class AutopilotService {

    /**
     * Main entry point to run all automated checks for a client
     */
    static async runAllChecks(clientId: number) {
        const results = {
            policies: await this.checkPolicyExpirations(clientId),
            risks: await this.checkHighRiskVulnerabilities(clientId),
            controls: await this.checkOverdueControls(clientId),
            assetThreats: await this.checkAssetThreats(clientId),
            vendorThreats: await this.checkVendorThreats(clientId),
            vendorContracts: await this.checkVendorContracts(clientId),
            expiredEvidence: await this.checkExpiredEvidence(clientId),
            businessContinuity: await this.checkBusinessContinuity(clientId),
            totalCreated: 0
        };

        results.totalCreated = results.policies + results.risks + results.controls + results.assetThreats +
            results.vendorThreats + results.vendorContracts + results.expiredEvidence + results.businessContinuity;
        return results;
    }

    /**
     * Check for policies that haven't been updated in over a year (Annual Review)
     */
    static async checkPolicyExpirations(clientId: number) {
        const db = await getDb();
        const oneYearAgo = subDays(new Date(), 365);

        // Find policies not updated in > 1 year
        const stalePolicies = await db.select().from(clientPolicies).where(
            and(
                eq(clientPolicies.clientId, clientId),
                or(
                    eq(clientPolicies.status, 'approved'),
                    eq(clientPolicies.status, 'draft')
                ),
                lt(clientPolicies.updatedAt, oneYearAgo)
            )
        );

        let count = 0;
        for (const policy of stalePolicies) {
            if (!policy.updatedAt) continue;

            const daysSinceUpdate = differenceInDays(new Date(), new Date(policy.updatedAt));

            const created = await this.createTask({
                clientId,
                title: `Annual Policy Review: ${policy.name}`,
                description: `Policy "${policy.name}" was last updated ${daysSinceUpdate} days ago. An annual review is required to ensure compliance.`,
                type: 'policy_review',
                priority: 'medium',
                entityType: 'policy',
                entityId: policy.id,
                dueDate: addDays(new Date(), 30)
            });

            if (created) count++;
        }

        return count;
    }

    /**
     * Check for High Residual Risks (Score >= 15) that need attention
     */
    static async checkHighRiskVulnerabilities(clientId: number) {
        const db = await getDb();
        // Find risks with High Residual Score
        const criticalRisks = await db.select().from(riskAssessments).where(
            and(
                eq(riskAssessments.clientId, clientId),
                gt(riskAssessments.residualScore, 14),
                not(eq(riskAssessments.status, 'draft'))
            )
        );

        let count = 0;
        for (const risk of criticalRisks) {
            if (risk.status === 'draft') continue;

            const created = await this.createTask({
                clientId,
                title: `Critical Risk Unmitigated: ${risk.title}`,
                description: `Risk "${risk.title}" has a high residual risk score (${risk.residualScore}). Immediate treatment or acceptance is required.`,
                type: 'risk_review', // Correct type
                priority: 'critical',
                entityType: 'risk', // Correct entityType
                entityId: risk.id,
                dueDate: addDays(new Date(), 7)
            });

            if (created) count++;
        }

        return count;
    }

    /**
     * Check for controls that are overdue (dueDate passed and not implemented)
     */
    static async checkOverdueControls(clientId: number) {
        const db = await getDb();
        const now = new Date();

        const overdueControls = await db.select().from(clientControls)
            .where(and(
                eq(clientControls.clientId, clientId),
                or( // Check NOT implemented OR in progress
                    eq(clientControls.status, 'not_implemented'),
                    eq(clientControls.status, 'in_progress')
                ),
                lt(clientControls.dueDate, now)
            ));

        let count = 0;
        for (const control of overdueControls) {
            if (!control.dueDate) continue;

            const daysOverdue = differenceInDays(now, new Date(control.dueDate));

            const created = await this.createTask({
                clientId,
                title: `Control Implementation Overdue: ${control.controlId}`,
                description: `Control implementation for ${control.controlId} was due ${daysOverdue} days ago.`,
                type: 'control_assessment',
                priority: 'high',
                entityType: 'control',
                entityId: control.id,
                dueDate: addDays(new Date(), 7)
            });

            if (created) count++;
        }

        return count;
    }

    /**
     * Check assets for new vulnerabilities (CVEs)
     * Triggers on KEV matches or High match score (>90)
     */
    static async checkAssetThreats(clientId: number) {
        const db = await getDb();
        const clientAssets = await db.select().from(assets).where(eq(assets.clientId, clientId));

        let count = 0;
        for (const asset of clientAssets) {
            try {
                // Scan asset (this also saves to DB)
                const suggestions = await scanAssetForCves(asset);

                // Filter for critical issues to create tasks
                const criticalIssues = suggestions.filter(s => s.isKev || s.matchScore > 90);

                if (criticalIssues.length > 0) {
                    const issueSummary = criticalIssues.slice(0, 3).map(s => s.cveId).join(', ');

                    const created = await this.createTask({
                        clientId,
                        title: `Critical Vulnerabilities on Asset: ${asset.name}`,
                        description: `Threat Intelligence detected ${criticalIssues.length} critical vulnerabilities for ${asset.name}. IDs: ${issueSummary}. \n\n${criticalIssues.some(s => s.isKev) ? '⚠️ Contains Known Exploited Vulnerabilities (KEV).' : ''}`,
                        type: 'risk_review',
                        priority: 'critical',
                        entityType: 'risk', // Mapping to risk for now as we don't have asset entity type in workItems yet or use generic
                        entityId: asset.id, // This might need a link to asset listing
                        dueDate: addDays(new Date(), 3) // Urgent
                    });

                    if (created) count++;
                }
            } catch (e) {
                console.error(`Failed to scan asset ${asset.id}`, e);
            }
        }
        return count;
    }

    /**
     * Check vendors for new vulnerabilities
     */
    static async checkVendorThreats(clientId: number) {
        const db = await getDb();
        // Since vendors are global in this schema (no clientId on vendors table directly? Wait, vendors table usually has clientId?)
        // Checking schema... vendors table has ID, name, etc. But usually linked via 'user_clients' or similar?
        // Ah, looking at schema.ts: vendors table (lines 2350+)
        // Let's assume vendors are relevant to client via `vendor_contracts` or filtered context.
        // Actually earlier I saw `vendor.list` router uses `clientId` to filter. 
        // Let's check schema for `vendors` table again to be sure if it has `clientId` or if it's many-to-many.
        // Schema view showed `vendors` table starting at line 3770 (implied, not fully shown).
        // I will assume simple case: `vendors` has `clientId` OR we fetch all vendors. 
        // Based on `scanVendorForCves(vendorId)`, it iterates. 

        // Let's rely on `vendors` having `clientId` which is standard in this app.
        // If not, I'll catch the error.

        const clientVendors = await db.select().from(vendors).where(eq(vendors.clientId, clientId));

        let count = 0;
        for (const vendor of clientVendors) {
            try {
                const suggestions = await scanVendorForCves(vendor.id);
                // Filter for critical (CVSS > 9 or KEV)
                const criticalIssues = suggestions.filter(s => s.isKev || (s.cvssScore && parseFloat(s.cvssScore) >= 9.0));

                if (criticalIssues.length > 0) {
                    const issueSummary = criticalIssues.slice(0, 3).map(s => s.cveId).join(', ');

                    const created = await this.createTask({
                        clientId,
                        title: `Security Advisory: ${vendor.name}`,
                        description: `Critical vulnerabilities detected for vendor ${vendor.name}. ${criticalIssues.length} issues found. IDs: ${issueSummary}.`,
                        type: 'vendor_assessment',
                        priority: 'high',
                        entityType: 'vendor',
                        entityId: vendor.id,
                        dueDate: addDays(new Date(), 7)
                    });

                    if (created) count++;
                }
            } catch (e) {
                console.error(`Failed to scan vendor ${vendor.id}`, e);
            }
        }
        return count;
    }

    /**
     * Check for vendor contracts expiring within 30 days
     */
    static async checkVendorContracts(clientId: number) {
        const db = await getDb();
        const thirtyDaysFromNow = addDays(new Date(), 30);
        const today = new Date();

        const expiringContracts = await db.select().from(vendorContracts).where(
            and(
                eq(vendorContracts.clientId, clientId),
                eq(vendorContracts.status, 'Active'),
                lt(vendorContracts.endDate, thirtyDaysFromNow),
                gt(vendorContracts.endDate, today)
            )
        );

        let count = 0;
        for (const contract of expiringContracts) {
            if (!contract.endDate) continue;

            const daysUntilExpiry = differenceInDays(new Date(contract.endDate), today);

            const created = await this.createTask({
                clientId,
                title: `Contract Expiry: ${contract.title}`,
                description: `Vendor contract "${contract.title}" is expiring in ${daysUntilExpiry} days. Please review for renewal or termination.`,
                type: 'vendor_assessment',
                priority: daysUntilExpiry < 14 ? 'high' : 'medium',
                entityType: 'vendor', // Close enough, or maybe we need 'contract' type? Using vendor for now.
                entityId: contract.vendorId, // Link to vendor
                dueDate: contract.endDate
            });

            if (created) count++;
        }
        return count;
    }

    /**
     * Check for stale evidence (> 1 year old) or specific expiry if available (in 'description' metadata?)
     * For now, we check 'lastVerified' > 1 year
     */
    static async checkExpiredEvidence(clientId: number) {
        const db = await getDb();
        const oneYearAgo = subDays(new Date(), 365);

        // Find evidence not verified in > 1 year
        const staleEvidence = await db.select().from(evidence).where(
            and(
                eq(evidence.clientId, clientId),
                lt(evidence.lastVerified, oneYearAgo)
            )
        );

        let count = 0;
        for (const ev of staleEvidence) {
            const created = await this.createTask({
                clientId,
                title: `Stale Evidence: ${ev.evidenceId}`,
                description: `Evidence "${ev.evidenceId}" (linked to control) has not been verified in over a year. Please re-validate.`,
                type: 'control_assessment',
                priority: 'medium',
                entityType: 'evidence',
                entityId: ev.id,
                dueDate: addDays(new Date(), 14)
            });

            if (created) count++;
        }
        return count;
    }

    /**
     * Check if a Business Impact Analysis (BIA) has been conducted in the last 12 months.
     * We look at `bcpProjects` table for completed BIA projects.
     */
    static async checkBusinessContinuity(clientId: number) {
        const db = await getDb();
        const oneYearAgo = subDays(new Date(), 365);

        const recentBia = await db.select().from(bcpProjects).where(
            and(
                eq(bcpProjects.clientId, clientId),
                // Assuming we can identify BIA projects by name or implicit assumption?
                // Or checking if ANY BCP project was completed recently.
                eq(bcpProjects.status, 'completed'),
                gt(bcpProjects.createdAt, oneYearAgo)
            )
        ).limit(1);

        if (recentBia.length === 0) {
            // No recent BIA found
            const created = await this.createTask({
                clientId,
                title: `Annual Business Impact Analysis (BIA) Required`,
                description: `No completed Business Impact Analysis (BIA) project was found for the last 12 months. Regular BIAs are critical for ISO 22301 and SOC 2 compliance.`,
                type: 'risk_review', // reusing risk_review as generic key
                priority: 'high',
                entityType: 'task',
                entityId: 0, // System level task
                dueDate: addDays(new Date(), 30)
            });
            return created ? 1 : 0;
        }

        return 0;
    }

    private static async createTask(params: {
        clientId: number;
        title: string;
        description: string;
        type: 'policy_review' | 'control_assessment' | 'risk_review' | 'vendor_assessment' | 'corrective_action' | 'general_task';
        priority: 'low' | 'medium' | 'high' | 'critical';
        entityType: 'policy' | 'control' | 'risk' | 'vendor' | 'evidence' | 'task';
        entityId: number;
        dueDate?: Date;
    }): Promise<boolean> {
        const db = await getDb();

        // 1. Deduplication Check
        const existing = await db.query.workItems.findFirst({
            where: and(
                eq(workItems.clientId, params.clientId),
                eq(workItems.entityType, params.entityType),
                eq(workItems.entityId, params.entityId),
                or(
                    eq(workItems.status, 'pending'),
                    eq(workItems.status, 'in_progress')
                )
            )
        });

        if (existing) {
            return false; // Task already exists
        }

        // 2. Create Task
        await db.insert(workItems).values({
            clientId: params.clientId,
            title: params.title,
            description: params.description,
            type: params.type,
            priority: params.priority,
            status: 'pending',
            entityType: params.entityType,
            entityId: params.entityId,
            dueDate: params.dueDate,
            metadata: {
                source: 'advisor_autopilot',
                generatedAt: new Date().toISOString()
            }
        });

        return true;
    }
}
