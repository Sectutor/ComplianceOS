
import { llmService } from '../llm/service';
import { getDb } from '../../db';
import { globalVendors, vendors, vendorChangeLogs } from '../../schema';
import { eq, ilike, or, and, sql } from 'drizzle-orm';

export interface TrustCenterAnalysis {
    score: number;
    docs: Array<{
        name: string;
        url: string;
        type: string;
        lastReviewed?: string;
    }>;
    gaps: string[];
    riskSummary: string;
    // Advanced Subprocessor Logic
    subprocessors?: Array<{ name: string; purpose: string; location: string }>;
    dpaAnalysis?: {
        liabilityCap?: string;
        auditRights?: string;
        breachNoticeWindow?: string;
    };
}

export class VRMAgentService {
    /**
     * Common patterns for trust center URLs
     */
    private static TRUST_PATTERNS = [
        '/trust',
        '/trust-center',
        '/security',
        '/compliance',
        '/legal/security',
        '/legal/privacy'
    ];

    /**
     * Subdomains common for trust centers
     */
    private static TRUST_SUBDOMAINS = [
        'trust',
        'trustportal',
        'security'
    ];

    /**
     * Check if a URL is reachable
     */
    private async checkUrlAvailability(url: string): Promise<boolean> {
        try {
            console.log(`[VRM Agent] Checking availability of: ${url}`);
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(4000)
            });
            if (response.ok) return true;
        } catch (e) {
            // Some servers block HEAD, try GET with a tiny body
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Range': 'bytes=0-100' }, // Just get first 100 bytes
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Discover a vendor's trust center URL
     */
    async discoverTrustCenter(vendorName: string, website?: string): Promise<string | null> {
        console.log(`[VRM Agent] Discovery started for: ${vendorName} (${website || 'no website'})`);

        // 0. Check Global Vendor Database First
        try {
            const db = await getDb();
            const searchPattern = `%${vendorName}%`;
            const globalResult = await db.select()
                .from(globalVendors)
                .where(
                    or(
                        ilike(globalVendors.name, searchPattern),
                        website ? eq(globalVendors.website, website) : sql`false`
                    )
                )
                .limit(1);

            if (globalResult.length > 0 && globalResult[0].trustCenterUrl) {
                console.log(`[VRM Agent] Found "${vendorName}" in Global Database: ${globalResult[0].trustCenterUrl}`);
                return globalResult[0].trustCenterUrl;
            }
        } catch (e) {
            console.error("[VRM Agent] Global database check failed:", e);
        }

        let baseUrl = "";
        let domain = "";

        if (website) {
            baseUrl = website.replace(/\/$/, '');
            if (!baseUrl.startsWith('http')) {
                baseUrl = 'https://' + baseUrl;
            }
            try {
                const urlObj = new URL(baseUrl);
                domain = urlObj.hostname.replace(/^www\./, '');
            } catch (e) {
                // If URL parsing fails, fallback to simple string manipulation
                domain = (website.split('/')[0] || "").replace(/^www\./, '');
            }
        } else {
            // No website provided, try to guess domain from name
            const cleanName = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanName) {
                baseUrl = `https://www.${cleanName}.com`;
                domain = `${cleanName}.com`;
            } else {
                return null;
            }
        }

        const lowName = vendorName.toLowerCase();

        // 1. Major provider heuristics (Always check these first)
        const heuristics: Record<string, string> = {
            'aws': 'https://aws.amazon.com/compliance',
            'amazon web services': 'https://aws.amazon.com/compliance',
            'google': 'https://cloud.google.com/trust-center',
            'microsoft': 'https://www.microsoft.com/en-us/trust-center',
            'azure': 'https://www.microsoft.com/en-us/trust-center',
            'slack': 'https://slack.com/trust',
            'zoom': 'https://zoom.us/trust',
            'stripe': 'https://stripe.com/docs/security',
            'figma': 'https://www.figma.com/security',
            'atlassian': 'https://www.atlassian.com/trust',
            'jira': 'https://www.atlassian.com/trust',
            'supabase': 'https://www.supabase.com/trust',
            'salesforce': 'https://trust.salesforce.com',
            'hubspot': 'https://www.hubspot.com/security',
            'okta': 'https://www.okta.com/trust',
            'auth0': 'https://auth0.com/security',
            'github': 'https://github.com/security',
        };

        for (const [key, val] of Object.entries(heuristics)) {
            if (lowName.includes(key)) {
                if (await this.checkUrlAvailability(val)) return val;
            }
        }

        // 2. Generate candidate URLs
        const candidates: string[] = [];

        // Subdomains
        if (domain) {
            VRMAgentService.TRUST_SUBDOMAINS.forEach(sub => {
                candidates.push(`https://${sub}.${domain}`);
            });
        }

        // Paths
        VRMAgentService.TRUST_PATTERNS.forEach(path => {
            candidates.push(`${baseUrl}${path}`);
        });

        // 3. Test candidates
        console.log(`[VRM Agent] Testing ${candidates.length} candidate URLs for ${vendorName}...`);

        for (const url of candidates) {
            if (await this.checkUrlAvailability(url)) {
                console.log(`[VRM Agent] FOUND reachable trust center: ${url}`);
                return url;
            }
        }

        // Fallback to the most likely pattern if none resolve
        console.log(`[VRM Agent] No candidate URL resolved. Falling back to default pattern.`);
        return `${baseUrl}/trust`;
    }

    /**
     * Analyze a trust center content
     */
    async analyzeTrustCenter(vendorId: number, url: string): Promise<TrustCenterAnalysis> {
        const db = await getDb();
        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId)
        });

        if (!vendor) throw new Error("Vendor not found");

        // Advanced Prompt for GDPR & Subprocessors
        const prompt = `
        You are an AI VRM Agent. Analyze the trust posture of the following vendor with a focus on GDPR Article 28 compliance.
        Vendor: ${vendor.name}
        Public Trust Center URL: ${url}
        Website: ${vendor.website}

        Task:
        1. Identify common security certifications (SOC2, ISO 27001, GDPR, etc.).
        2. Assign a Trust Posture Score (0-100).
        3. Identify Likely Subprocessors: Scan for their own list of subprocessors if public.
        4. DPA Analysis: Look for clauses regarding Liability Caps, Audit Rights, and Breach Notification windows.
        5. Provide a risk summary focusing on GDPR suitability.

        Return the results in a STRICT JSON format like this:
        {
          "score": 85,
          "docs": [
            { "name": "SOC 2 Type II Report", "url": "https://...", "type": "SOC2" }
          ],
          "gaps": ["No public SOC3", "No mention of breach windows"],
          "riskSummary": "Vendor maintains a strong security posture...",
          "subprocessors": [
            { "name": "AWS", "purpose": "Hosting", "location": "USA" }
          ],
          "dpaAnalysis": {
            "liabilityCap": "12 months fees",
            "auditRights": "Annual",
            "breachNoticeWindow": "72 hours"
          }
        }
        `;

        try {
            const response = await llmService.generate({
                systemPrompt: "You are a senior security auditor and VRM expert.",
                userPrompt: prompt,
                jsonMode: true,
                feature: 'vrm_analysis'
            });

            if (!response || !response.text) {
                throw new Error("Empty response from LLM service");
            }

            let data: TrustCenterAnalysis;
            try {
                const cleanJson = response.text.replace(/```json\n?|\n?```/g, '').trim();
                data = JSON.parse(cleanJson) as TrustCenterAnalysis;
            } catch (e) {
                console.error("Failed to parse LLM response as JSON:", response.text);
                data = {
                    score: 50,
                    docs: [],
                    gaps: ["Analysis failed: malformed AI response"],
                    riskSummary: "Automated analysis failed to parse. Please review manually.",
                    subprocessors: [],
                    dpaAnalysis: {}
                };
            }

            // Update vendor in DB with new fields
            await db.update(vendors)
                .set({
                    trustCenterUrl: url,
                    trustCenterData: data,
                    trustScore: data.score,
                    isSubprocessor: true,
                    dataLocation: data.subprocessors?.[0]?.location || 'Global',
                    recursiveSubprocessors: data.subprocessors || [],
                    dpaAnalysis: data.dpaAnalysis || {},
                    updatedAt: new Date()
                })
                .where(eq(vendors.id, vendorId));

            return data;
        } catch (error) {
            console.error("VRM Analysis failed:", error);
            return {
                score: 0,
                docs: [],
                gaps: ["Analysis failed: " + (error as Error).message],
                riskSummary: "Analysis could not be completed at this time."
            };
        }
    }

    /**
     * Detect changes and create logs if necessary
     */
    async detectChanges(vendorId: number): Promise<void> {
        const db = await getDb();
        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId)
        });

        if (!vendor || !vendor.trustCenterUrl) return;

        try {
            const response = await fetch(vendor.trustCenterUrl, { method: 'HEAD' });
            const lastModified = response.headers.get('last-modified');

            if (lastModified) {
                const newDate = new Date(lastModified);
                const oldDate = vendor.lastTrustCenterChange ? new Date(vendor.lastTrustCenterChange) : null;

                if (!oldDate || newDate.getTime() > oldDate.getTime()) {
                    console.log(`[VRM Agent] Change detected for ${vendor.name}`);

                    // Trigger re-analysis
                    await this.analyzeTrustCenter(vendorId, vendor.trustCenterUrl);

                    // Log change
                    await db.insert(vendorChangeLogs).values({
                        clientId: vendor.clientId,
                        vendorId: vendor.id,
                        changeType: 'trust_center_update',
                        description: 'Detected change in Trust Center headers',
                        oldValue: oldDate ? { lastModified: oldDate } : null,
                        newValue: { lastModified: newDate }
                    });

                    // Update last change timestamp
                    await db.update(vendors)
                        .set({ lastTrustCenterChange: newDate })
                        .where(eq(vendors.id, vendorId));
                }
            }
        } catch (e) {
            console.error(`[VRM Agent] Change detection failed for ${vendor.name}:`, e);
        }
    }
}

export const vrmAgent = new VRMAgentService();
