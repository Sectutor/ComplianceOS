// Guided Compliance Journey — State Machine
// Manages the progressive wizard flow for first-run setup experience

import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { clientJourney } from "../schema_client_journey";

export type JourneyStep =
  | "welcome"
  | "select_framework"
  | "review_controls"
  | "assign_owners"
  | "connect_tools"
  | "add_evidence"
  | "invite_team"
  | "setup_complete";

export type OnboardingStatus = "not_started" | "in_progress" | "complete";

export interface JourneyState {
  clientId: number;
  currentStep: JourneyStep;
  completedSteps: JourneyStep[];
  skippedSteps: JourneyStep[];
  selectedFramework?: string;
  onboardingStatus: OnboardingStatus;
  startedAt?: Date;
  completedAt?: Date;
}

const ALL_STEPS: JourneyStep[] = [
  "welcome",
  "select_framework",
  "review_controls",
  "assign_owners",
  "connect_tools",
  "add_evidence",
  "invite_team",
  "setup_complete",
];

function getStepIndex(step: JourneyStep): number {
  return ALL_STEPS.indexOf(step);
}

function toJourneyState(row: any): JourneyState {
  return {
    clientId: row.clientId,
    currentStep: row.currentStep as JourneyStep,
    completedSteps: (row.completedSteps ?? []) as JourneyStep[],
    skippedSteps: (row.skippedSteps ?? []) as JourneyStep[],
    selectedFramework: row.selectedFramework ?? undefined,
    onboardingStatus: row.onboardingStatus as OnboardingStatus,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  };
}

/**
 * Get existing journey record or create a new one for the given client.
 */
export async function getOrCreateJourney(clientId: number): Promise<JourneyState> {
  const db = await getDb();

  let rows = await db
    .select()
    .from(clientJourney)
    .where(eq(clientJourney.clientId, clientId))
    .limit(1);

  if (rows.length > 0) {
    return toJourneyState(rows[0]);
  }

  // Create a new journey record
  const [inserted] = await db
    .insert(clientJourney)
    .values({
      clientId,
      currentStep: "welcome",
      completedSteps: [],
      skippedSteps: [],
      onboardingStatus: "not_started",
    })
    .returning();

  return toJourneyState(inserted);
}

/**
 * Mark a step as completed and advance to the next step.
 * If the step is already completed, this is a no-op.
 */
export async function advanceJourney(clientId: number, step: JourneyStep): Promise<void> {
  const db = await getDb();
  const journey = await getOrCreateJourney(clientId);

  // Don't re-advance already-completed steps
  if (journey.completedSteps.includes(step)) return;

  const completedSteps = [...journey.completedSteps, step];
  const stepIdx = getStepIndex(step);
  const nextStep = stepIdx < ALL_STEPS.length - 1 ? ALL_STEPS[stepIdx + 1] : "setup_complete";
  const isComplete = nextStep === "setup_complete";

  await db
    .update(clientJourney)
    .set({
      currentStep: nextStep,
      completedSteps,
      onboardingStatus: isComplete ? "complete" : "in_progress",
      startedAt: journey.startedAt ?? (journey.onboardingStatus === "not_started" ? new Date() : undefined),
      completedAt: isComplete ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(clientJourney.clientId, clientId));
}

/**
 * Skip a step (will not block progression).
 */
export async function skipJourneyStep(clientId: number, step: JourneyStep): Promise<void> {
  const db = await getDb();
  const journey = await getOrCreateJourney(clientId);

  const skippedSteps = journey.skippedSteps.includes(step)
    ? journey.skippedSteps
    : [...journey.skippedSteps, step];

  // If the current step is being skipped, advance to next
  let currentStep = journey.currentStep;
  let completedSteps = journey.completedSteps;
  let onboardingStatus = journey.onboardingStatus;

  if (journey.currentStep === step) {
    const stepIdx = getStepIndex(step);
    const nextStep = stepIdx < ALL_STEPS.length - 1 ? ALL_STEPS[stepIdx + 1] : "setup_complete";
    currentStep = nextStep;
    completedSteps = [...completedSteps, step];
    onboardingStatus = nextStep === "setup_complete" ? "complete" : "in_progress";
  }

  await db
    .update(clientJourney)
    .set({
      currentStep,
      completedSteps,
      skippedSteps,
      onboardingStatus,
      startedAt: journey.startedAt ?? new Date(),
      completedAt: onboardingStatus === "complete" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(clientJourney.clientId, clientId));
}

/**
 * Returns the next uncompleted step, or null if the journey is complete.
 */
export async function getNextStep(clientId: number): Promise<JourneyStep | null> {
  const journey = await getOrCreateJourney(clientId);
  if (journey.onboardingStatus === "complete") return null;
  return journey.currentStep;
}

/**
 * Mark the entire journey as complete.
 */
export async function completeJourney(clientId: number): Promise<void> {
  const db = await getDb();
  await db
    .update(clientJourney)
    .set({
      currentStep: "setup_complete",
      completedSteps: ALL_STEPS.filter((s) => s !== "setup_complete"),
      onboardingStatus: "complete",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clientJourney.clientId, clientId));
}

/**
 * Check if a client's journey is complete.
 */
export async function isJourneyComplete(clientId: number): Promise<boolean> {
  const journey = await getOrCreateJourney(clientId);
  return journey.onboardingStatus === "complete";
}

/**
 * Get progress percentage and metadata.
 */
export async function getJourneyProgress(
  clientId: number
): Promise<{ percent: number; step: string; totalSteps: number; completedSteps: number }> {
  const journey = await getOrCreateJourney(clientId);
  const activeSteps = ALL_STEPS.filter((s) => s !== "setup_complete"); // 7 steps
  const totalSteps = activeSteps.length;
  const completedCount = journey.completedSteps.filter((s) => s !== "setup_complete").length;
  // Don't count skipped in numerator but they count as "done" in the display
  const skippedCount = journey.skippedSteps.length;
  const effectiveCompleted = Math.min(completedCount + skippedCount, totalSteps);
  const percent = Math.round((effectiveCompleted / totalSteps) * 100);

  return {
    percent,
    step: journey.currentStep,
    totalSteps,
    completedSteps: effectiveCompleted,
  };
}

/**
 * Reset a client's journey back to the starting state.
 */
export async function resetJourney(clientId: number): Promise<void> {
  const db = await getDb();
  await db
    .update(clientJourney)
    .set({
      currentStep: "welcome",
      completedSteps: [],
      skippedSteps: [],
      selectedFramework: null,
      onboardingStatus: "not_started",
      startedAt: undefined,
      completedAt: undefined,
      updatedAt: new Date(),
    })
    .where(eq(clientJourney.clientId, clientId));
}

/**
 * Set the selected framework for the journey.
 */
export async function setJourneyFramework(clientId: number, framework: string): Promise<void> {
  const db = await getDb();
  await db
    .update(clientJourney)
    .set({
      selectedFramework: framework,
      updatedAt: new Date(),
    })
    .where(eq(clientJourney.clientId, clientId));
}
