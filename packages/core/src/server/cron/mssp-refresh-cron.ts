/**
 * MSSP Cockpit Refresh Cron — runs hourly
 *
 * Pre-computes summary and common-gaps data so the MSSP dashboard
 * loads instantly without iterating over all clients at request time.
 * This is a warm-up pass; actual cached values should be stored in Redis.
 */
export async function hourlyMsspRefresh(): Promise<void> {
  const { MSSPCockpit } = await import('../../lib/mssp-cockpit');
  try {
    await MSSPCockpit.getSummary();
    await MSSPCockpit.getCommonGaps();
    console.log('[MSSP] Cache refreshed');
  } catch (error) {
    console.error('[MSSP] Refresh failed:', error);
  }
}
