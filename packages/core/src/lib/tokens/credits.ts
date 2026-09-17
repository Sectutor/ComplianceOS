/**
 * AI Token Credit System (Phase 3.4)
 *
 * Metered consumption tracking for AI API calls.
 * Each client gets a token bucket; top-ups are purchasable.
 *
 * Schema additions (run migration):
 *   ALTER TABLE clients ADD COLUMN token_balance INTEGER DEFAULT 0;
 *   ALTER TABLE clients ADD COLUMN token_used INTEGER DEFAULT 0;
 *   CREATE TABLE token_transactions (
 *     id SERIAL PRIMARY KEY,
 *     client_id INTEGER REFERENCES clients(id),
 *     amount INTEGER NOT NULL,
 *     type VARCHAR(20) CHECK (type IN ('purchase', 'consumption', 'refund')),
 *     description TEXT,
 *     created_at TIMESTAMP DEFAULT NOW()
 *   );
 */

import { and, eq } from 'drizzle-orm';
import { getDb } from '../../db';
import * as schema from '../../schema';

const DEFAULT_FREE_TOKENS = 10000; // Free tier gets 10k tokens
const TOKEN_PACK_PRICES: Record<string, { tokens: number; price: number }> = {
  starter_pack:  { tokens: 50000,  price: 9 },
  pro_pack:     { tokens: 250000, price: 39 },
  enterprise_pack: { tokens: 1000000, price: 149 },
};

/* ------------------------------------------------------------------ */
/*  Core operations                                                    */
/* ------------------------------------------------------------------ */

/**
 * Get current token balance for a client.
 */
export async function getTokenBalance(clientId: number): Promise<{ balance: number; used: number }> {
  const d = await getDb();
  const [client] = await d.select({
    balance: schema.clients.tokenBalance,
    used: schema.clients.tokenUsed,
  })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .limit(1);

  return {
    balance: client?.balance ?? 0,
    used: client?.used ?? 0,
  };
}

/**
 * Check if a client has enough tokens for a given operation cost.
 */
export async function hasSufficientTokens(clientId: number, cost: number): Promise<boolean> {
  const { balance } = await getTokenBalance(clientId);
  return balance >= cost;
}

/**
 * Deduct tokens from client balance after an AI call.
 * Throws if insufficient tokens.
 */
export async function consumeTokens(
  clientId: number,
  cost: number,
  description?: string,
): Promise<{ remaining: number }> {
  const d = await getDb();

  return await d.transaction(async (tx: any) => {
    const [client] = await tx.select({
      balance: schema.clients.tokenBalance,
      used: schema.clients.tokenUsed,
    })
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId))
      .limit(1);

    const currentBalance = client?.balance ?? 0;
    if (currentBalance < cost) {
      throw new Error(`Insufficient tokens. Have ${currentBalance}, need ${cost}`);
    }

    const newBalance = currentBalance - cost;
    const newUsed = (client?.used ?? 0) + cost;

    await tx.update(schema.clients)
      .set({
        tokenBalance: newBalance,
        tokenUsed: newUsed,
      })
      .where(eq(schema.clients.id, clientId));

    // Record transaction
    await tx.insert(schema.tokenTransactions).values({
      clientId,
      amount: -cost,
      type: 'consumption',
      description: description || 'AI API call',
    });

    return { remaining: newBalance };
  });
}

/**
 * Add purchased tokens to a client's balance.
 */
export async function addPurchasedTokens(
  clientId: number,
  packName: string,
): Promise<{ added: number; balance: number }> {
  const pack = TOKEN_PACK_PRICES[packName];
  if (!pack) {
    throw new Error(`Unknown token pack: ${packName}. Available: ${Object.keys(TOKEN_PACK_PRICES).join(', ')}`);
  }

  const d = await getDb();
  const [client] = await d.select({ balance: schema.clients.tokenBalance })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .limit(1);

  const newBalance = (client?.balance ?? 0) + pack.tokens;

  await d.update(schema.clients)
    .set({ tokenBalance: newBalance })
    .where(eq(schema.clients.id, clientId));

  await d.insert(schema.tokenTransactions).values({
    clientId,
    amount: pack.tokens,
    type: 'purchase',
    description: `Purchased ${packName} (${pack.tokens} tokens for $${pack.price})`,
  });

  return { added: pack.tokens, balance: newBalance };
}

/**
 * Cost estimator — calculate tokens needed for an AI operation.
 */
export function estimateTokenCost(
  model: string,
  inputChars: number,
  complexity: 'simple' | 'complex' = 'simple',
): number {
  // Rough heuristic: ~4 chars per token, plus complexity multiplier
  const baseTokens = Math.ceil(inputChars / 4);
  const multiplier = complexity === 'complex' ? 2.5 : 1.0;

  // Model-specific multipliers
  // DeepSeek, Qwen are cheaper; Anthropic/GPT-4 are more expensive
  const modelMultiplier =
    model.includes('deepseek') || model.includes('qwen') ? 0.5 :
    model.includes('gpt-4') || model.includes('claude') ? 2.0 :
    1.0;

  return Math.ceil(baseTokens * multiplier * modelMultiplier);
}

/**
 * Grant free starter tokens to a new client.
 */
export async function grantFreeTokens(clientId: number): Promise<void> {
  const d = await getDb();
  await d.update(schema.clients)
    .set({ tokenBalance: DEFAULT_FREE_TOKENS })
    .where(eq(schema.clients.id, clientId));

  await d.insert(schema.tokenTransactions).values({
    clientId,
    amount: DEFAULT_FREE_TOKENS,
    type: 'purchase',
    description: 'Free starter tokens',
  });
}
