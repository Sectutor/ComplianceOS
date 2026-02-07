#!/usr/bin/env node

/**
 * Redis Setup and Configuration Script
 * 
 * This script helps configure Redis for enterprise scalability
 */

import Redis from 'ioredis';
import { createCacheConfig } from '../src/lib/cache/manager.js';

console.log('🔧 Redis Setup and Configuration');
console.log('=================================\n');

async function setupRedis() {
  try {
    const config = createCacheConfig();
    
    console.log('📋 Redis Configuration:');
    console.log(`  Host: ${config.redis.host}`);
    console.log(`  Port: ${config.redis.port}`);
    console.log(`  Database: ${config.redis.db}`);
    console.log(`  Cluster: ${config.redis.cluster}`);
    console.log(`  Sentinel: ${config.redis.sentinel}`);

    // Create Redis client
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
    });

    console.log('\n🔗 Testing Redis connection...');
    
    // Test connection
    await redis.connect();
    console.log('✅ Redis connection established');

    // Test basic operations
    console.log('\n🧪 Testing Redis operations...');
    
    // Set test key
    await redis.set('test:connection', 'success', 'EX', 60);
    console.log('✅ SET operation successful');

    // Get test key
    const result = await redis.get('test:connection');
    if (result === 'success') {
      console.log('✅ GET operation successful');
    } else {
      console.log('❌ GET operation failed');
    }

    // Test performance
    console.log('\n⚡ Testing Redis performance...');
    const startTime = Date.now();
    
    // Batch operations
    const pipeline = redis.pipeline();
    for (let i = 0; i < 100; i++) {
      pipeline.set(`perf:test:${i}`, `value-${i}`, 'EX', 60);
    }
    await pipeline.exec();
    
    const batchTime = Date.now() - startTime;
    console.log(`✅ Batch SET (100 operations): ${batchTime}ms`);

    // Test memory usage
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory:(\d+)/);
    if (memoryMatch) {
      const memoryMB = parseInt(memoryMatch[1]) / 1024 / 1024;
      console.log(`📊 Current memory usage: ${memoryMB.toFixed(2)} MB`);
    }

    // Configure Redis for optimal performance
    console.log('\n⚙️  Configuring Redis for optimal performance...');
    
    // Set memory policy
    await redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
    console.log('✅ Memory policy set to allkeys-lru');

    // Set TCP keepalive
    await redis.config('SET', 'tcp-keepalive', '300');
    console.log('✅ TCP keepalive set to 300 seconds');

    // Test cache keys for compliance application
    console.log('\n🏗️  Setting up cache keys for compliance application...');
    
    const testData = {
      dashboard: {
        compliance: { score: 85, totalControls: 150, compliantControls: 128 },
        risk: { totalRisks: 45, highRisks: 5, exposure: 11 },
        recentActivity: [
          { action: 'control_updated', description: 'Updated access control policy', timestamp: new Date().toISOString() },
          { action: 'evidence_uploaded', description: 'Uploaded SOC 2 evidence', timestamp: new Date().toISOString() },
        ],
      },
      timestamp: new Date().toISOString(),
    };

    // Cache dashboard data
    await redis.setex('dashboard:client:1', 300, JSON.stringify(testData.dashboard));
    console.log('✅ Dashboard data cached (5min TTL)');

    // Test retrieval
    const cachedData = await redis.get('dashboard:client:1');
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      console.log('✅ Dashboard data retrieval successful');
      console.log(`   Compliance score: ${parsed.compliance.score}%`);
    }

    // Performance monitoring setup
    console.log('\n📈 Setting up performance monitoring...');
    
    // Enable slow log
    await redis.config('SET', 'slowlog-log-slower-than', '10000'); // 10ms
    console.log('✅ Slow query log enabled (10ms threshold)');

    // Get slow log
    const slowLog = await redis.slowlog('GET', 5);
    console.log(`📊 Recent slow queries: ${slowLog.length}`);

    // Memory optimization
    console.log('\n💾 Memory optimization check...');
    
    const memoryInfo = await redis.info('memory');
    const fragmentation = memoryInfo.match(/mem_fragmentation_ratio:(\d+\.?\d*)/);
    if (fragmentation) {
      const ratio = parseFloat(fragmentation[1]);
      console.log(`📊 Memory fragmentation ratio: ${ratio}`);
      if (ratio > 1.5) {
        console.log('⚠️  High memory fragmentation detected');
      } else {
        console.log('✅ Memory fragmentation within acceptable range');
      }
    }

    console.log('\n✅ Redis setup and configuration complete!');
    console.log('\n🎯 Redis is ready for enterprise scalability with:');
    console.log('   • Connection pooling and monitoring');
    console.log('   • Performance optimization');
    console.log('   • Cache key management');
    console.log('   • Memory optimization');
    console.log('   • Slow query monitoring');

    // Close connection
    await redis.disconnect();
    console.log('\n👋 Redis connection closed');

  } catch (error) {
    console.error('❌ Redis setup failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   • Ensure Redis server is running');
      console.log('   • Check Redis host and port configuration');
      console.log('   • Verify firewall settings');
      console.log('   • Check Redis authentication credentials');
    } else if (error.message.includes('NOAUTH')) {
      console.log('\n💡 Authentication required:');
      console.log('   • Set REDIS_PASSWORD environment variable');
      console.log('   • Update .env file with correct credentials');
    } else {
      console.log('\n💡 General troubleshooting:');
      console.log('   • Check Redis server logs');
      console.log('   • Verify network connectivity');
      console.log('   • Ensure Redis version compatibility');
    }
    
    process.exit(1);
  }
}

// Run setup
setupRedis().catch(console.error);