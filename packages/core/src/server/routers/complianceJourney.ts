// Guided Compliance Journey — tRPC Router
import { z } from "zod";
import {
  getOrCreateJourney,
  advanceJourney,
  skipJourneyStep,
  getNextStep,
  completeJourney,
  isJourneyComplete,
  getJourneyProgress,
  resetJourney,
  setJourneyFramework,
} from "../../lib/compliance-journey";

const journeyStepSchema = z.enum([
  "welcome",
  "select_framework",
  "review_controls",
  "assign_owners",
  "connect_tools",
  "add_evidence",
  "invite_team",
  "setup_complete",
]);

export const createComplianceJourneyRouter = (t: any, clientProcedure: any, clientEditorProcedure: any) => {
  return t.router({
    /**
     * Get the current journey state for a client.
     */
    getState: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return getOrCreateJourney(input.clientId);
      }),

    /**
     * Advance to the next step and mark the given step as completed.
     */
    advance: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          step: journeyStepSchema,
        })
      )
      .mutation(async ({ input }: any) => {
        await advanceJourney(input.clientId, input.step);
        return { success: true };
      }),

    /**
     * Skip a step (won't block progression).
     */
    skip: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          step: journeyStepSchema,
        })
      )
      .mutation(async ({ input }: any) => {
        await skipJourneyStep(input.clientId, input.step);
        return { success: true };
      }),

    /**
     * Set the selected framework for the compliance journey.
     */
    setFramework: clientEditorProcedure
      .input(
        z.object({
          clientId: z.number(),
          framework: z.string().min(1),
        })
      )
      .mutation(async ({ input }: any) => {
        await setJourneyFramework(input.clientId, input.framework);
        return { success: true };
      }),

    /**
     * Get progress percentage and details.
     */
    getProgress: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return getJourneyProgress(input.clientId);
      }),

    /**
     * Get the next uncompleted step.
     */
    getNextStep: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return getNextStep(input.clientId);
      }),

    /**
     * Check if the compliance journey is complete.
     */
    isComplete: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return isJourneyComplete(input.clientId);
      }),

    /**
     * Reset the journey back to the initial state.
     */
    reset: clientEditorProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }: any) => {
        await resetJourney(input.clientId);
        return { success: true };
      }),

    /**
     * Manually mark the entire journey as complete.
     */
    complete: clientEditorProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }: any) => {
        await completeJourney(input.clientId);
        return { success: true };
      }),
  });
};
