/**
 * Global Addon Executor Instance
 *
 * Set once during server initialization, then imported by the tRPC router.
 * This avoids circular dependencies between the core router and the addon package.
 */

import type { AddonExecutor } from './executor';

let instance: AddonExecutor | null = null;

export function setExecutor(exec: AddonExecutor): void {
  instance = exec;
}

export function getExecutor(): AddonExecutor {
  if (!instance) {
    throw new Error(
      'AddonExecutor not initialized. Call setExecutor() during server startup.',
    );
  }
  return instance;
}

export function hasExecutor(): boolean {
  return instance !== null;
}
