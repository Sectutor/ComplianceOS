/**
 * Cost, Token Quota & Recursion Circuit Breakers
 * Safeguards AI fleets from runaway recursive loops, excessive token usage,
 * and runaway API billing.
 */

export interface BotQuotaStatus {
  botId: string;
  dailyTokensUsed: number;
  dailyTokenLimit: number;
  isCircuitOpen: boolean;
  loopIterations: number;
  lastResetDate: string;
}

export class RateLimiterCircuitBreaker {
  private static readonly MAX_RECURSION_DEPTH = 5;
  private static readonly DEFAULT_DAILY_TOKEN_LIMIT = 500_000;

  private quotas: Map<string, BotQuotaStatus> = new Map();
  private today: string = new Date().toISOString().split("T")[0];

  private getOrInitQuota(botId: string): BotQuotaStatus {
    const currentDay = new Date().toISOString().split("T")[0];
    if (this.today !== currentDay) {
      this.quotas.clear();
      this.today = currentDay;
    }

    if (!this.quotas.has(botId)) {
      this.quotas.set(botId, {
        botId,
        dailyTokensUsed: 0,
        dailyTokenLimit: RateLimiterCircuitBreaker.DEFAULT_DAILY_TOKEN_LIMIT,
        isCircuitOpen: false,
        loopIterations: 0,
        lastResetDate: this.today,
      });
    }

    return this.quotas.get(botId)!;
  }

  /**
   * Checks if an execution is permitted before invoking LLM or tool
   */
  public checkAllowance(botId: string, estimatedTokens = 1000): { allowed: boolean; reason?: string } {
    const quota = this.getOrInitQuota(botId);

    if (quota.isCircuitOpen) {
      return {
        allowed: false,
        reason: `Circuit breaker tripped for bot ${botId}: Daily quota exceeded (${quota.dailyTokensUsed} / ${quota.dailyTokenLimit} tokens).`,
      };
    }

    if (quota.loopIterations >= RateLimiterCircuitBreaker.MAX_RECURSION_DEPTH) {
      quota.isCircuitOpen = true;
      return {
        allowed: false,
        reason: `Circuit breaker tripped for bot ${botId}: Maximum recursion depth (${RateLimiterCircuitBreaker.MAX_RECURSION_DEPTH} iterations) reached.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Consumes token count and increments loop iteration counter
   */
  public recordUsage(botId: string, tokensConsumed: number): void {
    const quota = this.getOrInitQuota(botId);
    quota.dailyTokensUsed += tokensConsumed;
    quota.loopIterations += 1;

    if (quota.dailyTokensUsed >= quota.dailyTokenLimit) {
      quota.isCircuitOpen = true;
    }
  }

  /**
   * Resets loop recursion depth after a task successfully completes
   */
  public resetTaskLoops(botId: string): void {
    const quota = this.getOrInitQuota(botId);
    quota.loopIterations = 0;
  }

  /**
   * Returns complete metrics for cockpit UI inspection
   */
  public getAllStatuses(): BotQuotaStatus[] {
    return Array.from(this.quotas.values());
  }
}

export const circuitBreaker = new RateLimiterCircuitBreaker();
