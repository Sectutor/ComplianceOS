import { z } from "zod";
import * as threatIntel from "../../lib/threatIntelligence";

export const createThreatIntelRouter = (t: any, protectedProcedure: any, clientProcedure: any) => t.router({
    scanAllAssets: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .mutation(async ({ input }: any) => {
            const results = await threatIntel.scanAllAssetsForClient(input.clientId);
            return { results }; // Frontend expects { results: [...] } or just array? Frontend: data.results
        }),

    scanVendor: clientProcedure
        .input(z.object({
            vendorId: z.number(),
            clientId: z.number().optional()
        }))
        .mutation(async ({ input }: any) => {
            const suggestions = await threatIntel.scanVendorForCves(input.vendorId);
            return { suggestions };
        }),

    getVendorSuggestions: protectedProcedure
        .input(z.object({ vendorId: z.number() }))
        .query(async ({ input }: any) => {
            const suggestions = await threatIntel.getVendorCveSuggestions(input.vendorId);
            return suggestions;
        }),
});
