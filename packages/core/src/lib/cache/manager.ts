/**
 * Redis Caching Layer for Enterprise Scale
 * 
 * This module provides multi-tier caching with Redis for hot data,
 * session management, and API response caching.
 */

import Redis from 'ioredis';
import { logger } from '../logger';

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    cluster?: boolean;
    sentinel?: boolean;
  };
  tiers: Array<{
    type: 'memory' | 'redis';
    ttl: number;
    maxSize?: number;
    keyPrefix?: string;
  }>;
  monitoring: {
    enabled: boolean;
    collectInterval: number;
    alertThresholds: {
      hitRate: number;
      memoryUsage: number;
      errorRate: number;
    };
  };
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: number;
  totalRequests: number;
  errorRate: number;
  timestamp: Date;
}

export class CacheManager {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { value: unknown; expires: number }>();
  private metrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    evictionRate: 0,
    memoryUsage: 0,
    totalRequests: 0,
    errorRate: 0,
    timestamp: new Date(),
  };
  private metricsInterval: NodeJS.Timeout | null = null;
  private requestStats = { hits: 0, misses: 0, errors: 0 };
  private maintenanceCounter = 0;

  constructor(private config: CacheConfig) {}

  private getRedisKey(key: string): string {
    const redisTier = this.config.tiers.find((t) => t.type === 'redis');
    const prefix = redisTier?.keyPrefix;
    return prefix ? `${prefix}${key}` : key;
  }

  /**
   * Initialize Redis connection and start monitoring
   */
  async initialize(): Promise<void> {
    try {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        connectTimeout: 10000,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 100, 2000),
      });

      await this.redis.connect();
      logger.info('[CACHE] Redis connection established');

      if (this.config.monitoring.enabled) {
        this.startMetricsCollection();
      }
    } catch (error) {
      logger.error({ message: '[CACHE] Failed to initialize Redis', error });
      // Continue without Redis - fallback to memory only
      this.redis = null;
    }
  }

  /**
   * Get value from cache (multi-tier lookup)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // L1: Memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.expires > Date.now()) {
        this.memoryCache.delete(key);
        this.memoryCache.set(key, memoryEntry);
        this.requestStats.hits++;
        return memoryEntry.value as T;
      } else if (memoryEntry) {
        // Expired entry - remove from memory
        this.memoryCache.delete(key);
      }

      // L2: Redis cache
      if (this.redis) {
        const redisKey = this.getRedisKey(key);
        const redisValue = await this.redis.get(redisKey);
        const legacyValue = !redisValue && redisKey !== key ? await this.redis.get(key) : null;
        const payload = redisValue ?? legacyValue;
        if (payload) {
          const parsed = JSON.parse(payload);
          // Promote to memory cache
          this.memoryCache.set(key, {
            value: parsed,
            expires: Date.now() + (this.config.tiers[0]?.ttl || 60) * 1000,
          });

          this.requestStats.hits++;
          return parsed as T;
        }
      }

      this.requestStats.misses++;
      return null;
    } catch (error) {
      this.requestStats.errors++;
      logger.error({ message: '[CACHE] Get error', key, error });
      return null;
    }
  }


  /**
   * Set value in cache (multi-tier storage)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const effectiveTtl = ttl || this.config.tiers[1]?.ttl || 300;
    
    try {
      // L1: Memory cache
      if (this.memoryCache.has(key)) this.memoryCache.delete(key);
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + effectiveTtl * 1000,
      });

      // L2: Redis cache
      if (this.redis) {
        const redisKey = this.getRedisKey(key);
        await this.redis.setex(redisKey, effectiveTtl, JSON.stringify(value));
        if (redisKey !== key) {
          await this.redis.del(key);
        }
      }

      // Memory cache cleanup
      this.cleanupMemoryCache();
    } catch (error) {
      logger.error({ message: '[CACHE] Set error', key, error });
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      
      if (this.redis) {
        const redisKey = this.getRedisKey(key);
        if (redisKey !== key) {
          await this.redis.del(redisKey, key);
        } else {
          await this.redis.del(key);
        }
      }
    } catch (error) {
      logger.error({ message: '[CACHE] Delete error', key, error });
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      
      if (this.redis) {
        await this.redis.flushdb();
      }
    } catch (error) {
      logger.error({ message: '[CACHE] Clear error', error });
    }
  }

  /**
   * Clean up expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    this.maintenanceCounter++;

    const maxSize = this.config.tiers[0]?.maxSize;
    if (maxSize && this.memoryCache.size > maxSize) {
      const evictCount = this.memoryCache.size - maxSize;
      for (let i = 0; i < evictCount; i++) {
        const oldestKey = this.memoryCache.keys().next().value as string | undefined;
        if (!oldestKey) break;
        this.memoryCache.delete(oldestKey);
      }
    }

    if (this.maintenanceCounter % 100 !== 0) return;
    let scanned = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires <= now) this.memoryCache.delete(key);
      if (++scanned >= 200) break;
    }
  }

  /**
   * Start collecting cache metrics
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.collectInterval);
  }

  /**
   * Collect current cache performance metrics
   */
  private collectMetrics(): void {
    const totalLookups = this.requestStats.hits + this.requestStats.misses;
    const totalOps = totalLookups + this.requestStats.errors;
    
    this.metrics = {
      hitRate: totalLookups > 0 ? (this.requestStats.hits / totalLookups) * 100 : 0,
      missRate: totalLookups > 0 ? (this.requestStats.misses / totalLookups) * 100 : 0,
      evictionRate: 0, // Would track Redis evictions
      memoryUsage: this.memoryCache.size,
      totalRequests: totalOps,
      errorRate: totalOps > 0 ? this.requestStats.errors / totalOps : 0,
      timestamp: new Date(),
    };

    // Check alert thresholds
    this.checkAlertThresholds();

    // Reset stats for next interval
    this.requestStats = { hits: 0, misses: 0, errors: 0 };
  }

  /**
   * Check if metrics exceed alert thresholds
   */
  private checkAlertThresholds(): void {
    const { alertThresholds } = this.config.monitoring;
    
    if (this.metrics.hitRate < alertThresholds.hitRate) {
      logger.warn(`[CACHE ALERT] Low cache hit rate: ${this.metrics.hitRate.toFixed(2)}%`);
    }

    if (this.metrics.memoryUsage > alertThresholds.memoryUsage) {
      logger.warn(`[CACHE ALERT] High memory usage: ${this.metrics.memoryUsage} entries`);
    }

    if (this.metrics.errorRate > alertThresholds.errorRate) {
      logger.error(`[CACHE ALERT] High error rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    }
  }

  /**
   * Get current cache performance metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{ healthy: boolean; metrics: CacheMetrics; redisConnected: boolean }> {
    let redisHealthy = false;
    
    if (this.redis) {
      try {
        await this.redis.ping();
        redisHealthy = true;
      } catch (error) {
        logger.error({ message: '[CACHE] Redis health check failed', error });
      }
    }

    return {
      healthy: true,
      metrics: this.getMetrics(),
      redisConnected: redisHealthy,
    };
  }

  /**
   * Gracefully shutdown cache system
   */
  async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
      logger.info('[CACHE] Redis connection closed');
    }

    this.memoryCache.clear();
    logger.info('[CACHE] Cache system shutdown');
  }
}

/**
 * Create enterprise cache configuration
 */
export function createCacheConfig(): CacheConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      cluster: process.env.REDIS_CLUSTER === 'true',
      sentinel: process.env.REDIS_SENTINEL === 'true',
    },
    tiers: [
      { type: 'memory', ttl: 60, maxSize: 1000 }, // L1: 1 minute, 1000 entries
      { type: 'redis', ttl: 300, keyPrefix: 'compliance:' }, // L2: 5 minutes
    ],
    monitoring: {
      enabled: true,
      collectInterval: 30000, // 30 seconds
      alertThresholds: {
        hitRate: 70, // 70% minimum hit rate
        memoryUsage: 800, // 800 entries max in memory
        errorRate: 0.02, // 2% maximum error rate
      },
    },
  };
}

/**
 * Cache keys for common data patterns
 */
export const CacheKeys = {
  dashboard: (clientId: number) => `dashboard:${clientId}`,
  complianceScore: (clientId: number) => `compliance:score:${clientId}`,
  riskRegister: (clientId: number) => `risk:register:${clientId}`,
  controls: (clientId: number) => `controls:${clientId}`,
  policies: (clientId: number) => `policies:${clientId}`,
  evidence: (clientId: number, evidenceId: string) => `evidence:${clientId}:${evidenceId}`,
  userSession: (userId: string) => `session:user:${userId}`,
  clientConfig: (clientId: number) => `config:client:${clientId}`,
  framework: (frameworkId: string) => `framework:${frameworkId}`,
  threatIntel: (threatId: string) => `threat:${threatId}`,
  vendor: (vendorId: string) => `vendor:${vendorId}`,
  apiResponse: (endpoint: string, params: string) => `api:${endpoint}:${hashParams(params)}`,
} as const;

/**
 * Hash function for generating cache keys from parameters
 */
function hashParams(params: string): string {
  let hash = 0;
  for (let i = 0; i < params.length; i++) {
    const char = params.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
