#!/usr/bin/env node

/**
 * Enterprise Load Testing Script
 * 
 * This script performs comprehensive load testing to validate
 * the scalability improvements implemented in the enterprise version.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
  endpoints: Array<{
    path: string;
    method: string;
    weight: number;
    expectedStatus: number;
  }>;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    endpoint: string;
    status: number;
    message: string;
    count: number;
  }>;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

class LoadTester {
  private results: TestResult = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerSecond: 0,
    errors: [],
    percentiles: { p50: 0, p95: 0, p99: 0 },
  };

  private responseTimes: number[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(private config: LoadTestConfig) {}

  async run(): Promise<TestResult> {
    console.log('🚀 Starting Enterprise Load Test');
    console.log('=================================\n');

    console.log(`📊 Configuration:`);
    console.log(`  Base URL: ${this.config.baseUrl}`);
    console.log(`  Concurrent Users: ${this.config.concurrentUsers}`);
    console.log(`  Requests per User: ${this.config.requestsPerUser}`);
    console.log(`  Total Requests: ${this.config.concurrentUsers * this.config.requestsPerUser}`);
    console.log(`  Ramp-up Time: ${this.config.rampUpTime}s`);
    console.log(`  Test Duration: ${this.config.testDuration}s`);
    console.log(`  Endpoints: ${this.config.endpoints.length}`);

    this.startTime = Date.now();

    // Start concurrent users with ramp-up
    const userPromises = [];
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const delay = (i / this.config.concurrentUsers) * this.config.rampUpTime * 1000;
      userPromises.push(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            this.simulateUser(i).then(resolve).catch(resolve);
          }, delay);
        })
      );
    }

    // Wait for all users to complete
    await Promise.all(userPromises);
    this.endTime = Date.now();

    // Calculate final results
    this.calculateResults();

    console.log('\n✅ Load test completed!');
    this.printResults();

    return this.results;
  }

  private async simulateUser(userId: number): Promise<void> {
    const userResults = [];
    
    for (let i = 0; i < this.config.requestsPerUser; i++) {
      const endpoint = this.selectEndpoint();
      const startTime = Date.now();
      
      try {
        const response = await this.makeRequest(endpoint);
        const responseTime = Date.now() - startTime;
        
        this.responseTimes.push(responseTime);
        this.results.totalRequests++;
        
        if (response.status === endpoint.expectedStatus) {
          this.results.successfulRequests++;
        } else {
          this.results.failedRequests++;
          this.recordError(endpoint.path, response.status, `Unexpected status: ${response.status}`);
        }
        
        // Update timing metrics
        this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
        this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
        
      } catch (error) {
        this.results.failedRequests++;
        this.results.totalRequests++;
        this.recordError(endpoint.path, 0, error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Add small delay between requests to simulate real user behavior
      await this.delay(Math.random() * 100 + 50); // 50-150ms delay
    }
  }

  private selectEndpoint() {
    const totalWeight = this.config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const endpoint of this.config.endpoints) {
      cumulativeWeight += endpoint.weight;
      if (random <= cumulativeWeight) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0]; // fallback
  }

  private async makeRequest(endpoint: LoadTestConfig['endpoints'][0]): Promise<{ status: number; data?: any }> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint.path, this.config.baseUrl);
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GRCompliance-LoadTester/1.0',
        },
        timeout: 30000, // 30 second timeout
      };

      const protocol = url.protocol === 'https:' ? https : http;
      
      const req = protocol.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, data });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private recordError(endpoint: string, status: number, message: string): void {
    const existingError = this.results.errors.find(e => e.endpoint === endpoint && e.status === status);
    if (existingError) {
      existingError.count++;
    } else {
      this.results.errors.push({ endpoint, status, message, count: 1 });
    }
  }

  private calculateResults(): void {
    const totalTime = (this.endTime - this.startTime) / 1000; // seconds
    
    this.results.requestsPerSecond = this.results.totalRequests / totalTime;
    this.results.averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    // Calculate percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    this.results.percentiles = {
      p50: this.percentile(sortedTimes, 50),
      p95: this.percentile(sortedTimes, 95),
      p99: this.percentile(sortedTimes, 99),
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printResults(): void {
    console.log('\n📈 Load Test Results:');
    console.log('======================');
    
    console.log(`\n🎯 Overall Performance:`);
    console.log(`  Total Requests: ${this.results.totalRequests.toLocaleString()}`);
    console.log(`  Successful Requests: ${this.results.successfulRequests.toLocaleString()}`);
    console.log(`  Failed Requests: ${this.results.failedRequests.toLocaleString()}`);
    console.log(`  Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  Requests per Second: ${this.results.requestsPerSecond.toFixed(2)}`);
    
    console.log(`\n⏱️  Response Times:`);
    console.log(`  Average: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Minimum: ${this.results.minResponseTime}ms`);
    console.log(`  Maximum: ${this.results.maxResponseTime}ms`);
    console.log(`  P50: ${this.results.percentiles.p50.toFixed(2)}ms`);
    console.log(`  P95: ${this.results.percentiles.p95.toFixed(2)}ms`);
    console.log(`  P99: ${this.results.percentiles.p99.toFixed(2)}ms`);
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      this.results.errors.forEach(error => {
        console.log(`  ${error.endpoint} (${error.status}): ${error.message} (${error.count}x)`);
      });
    }
    
    // Performance assessment
    console.log(`\n🎯 Performance Assessment:`);
    if (this.results.requestsPerSecond >= 100 && this.results.percentiles.p95 < 2000) {
      console.log('  ✅ EXCELLENT - Ready for enterprise deployment');
    } else if (this.results.requestsPerSecond >= 50 && this.results.percentiles.p95 < 5000) {
      console.log('  ✅ GOOD - Suitable for production with monitoring');
    } else if (this.results.requestsPerSecond >= 20 && this.results.percentiles.p95 < 10000) {
      console.log('  ⚠️  FAIR - Needs optimization before production');
    } else {
      console.log('  ❌ POOR - Requires significant optimization');
    }
  }
}

// Enterprise test scenarios
const scenarios = {
  development: {
    baseUrl: 'http://localhost:3000',
    concurrentUsers: 10,
    requestsPerUser: 50,
    rampUpTime: 10,
    testDuration: 60,
    endpoints: [
      { path: '/health', method: 'GET', weight: 20, expectedStatus: 200 },
      { path: '/api/trpc/dashboard.enhanced', method: 'POST', weight: 30, expectedStatus: 200 },
      { path: '/api/trpc/dashboard.stats', method: 'POST', weight: 25, expectedStatus: 200 },
      { path: '/api/trpc/clients.list', method: 'POST', weight: 15, expectedStatus: 200 },
      { path: '/api/trpc/controls.list', method: 'POST', weight: 10, expectedStatus: 200 },
    ],
  },
  
  staging: {
    baseUrl: 'https://staging.complianceos.com',
    concurrentUsers: 50,
    requestsPerUser: 100,
    rampUpTime: 30,
    testDuration: 300,
    endpoints: [
      { path: '/health', method: 'GET', weight: 15, expectedStatus: 200 },
      { path: '/api/trpc/dashboard.enhanced', method: 'POST', weight: 25, expectedStatus: 200 },
      { path: '/api/trpc/dashboard.stats', method: 'POST', weight: 20, expectedStatus: 200 },
      { path: '/api/trpc/clients.list', method: 'POST', weight: 15, expectedStatus: 200 },
      { path: '/api/trpc/controls.list', method: 'POST', weight: 10, expectedStatus: 200 },
      { path: '/api/trpc/risk.list', method: 'POST', weight: 10, expectedStatus: 200 },
      { path: '/api/trpc/evidence.list', method: 'POST', weight: 5, expectedStatus: 200 },
    ],
  },
  
  production: {
    baseUrl: 'https://api.complianceos.com',
    concurrentUsers: 100,
    requestsPerUser: 200,
    rampUpTime: 60,
    testDuration: 600,
    endpoints: [
      { path: '/health', method: 'GET', weight: 10, expectedStatus: 200 },
      { path: '/api/trpc/dashboard.enhanced', method: 'POST', weight: 20, expectedStatus: 200 },
      { path: '/api/trpc/dashboard.stats', method: 'POST', weight: 15, expectedStatus: 200 },
      { path: '/api/trpc/clients.list', method: 'POST', weight: 12, expectedStatus: 200 },
      { path: '/api/trpc/controls.list', method: 'POST', weight: 10, expectedStatus: 200 },
      { path: '/api/trpc/risk.list', method: 'POST', weight: 10, expectedStatus: 200 },
      { path: '/api/trpc/evidence.list', method: 'POST', weight: 8, expectedStatus: 200 },
      { path: '/api/trpc/compliance.score', method: 'POST', weight: 8, expectedStatus: 200 },
      { path: '/api/trpc/frameworks.list', method: 'POST', weight: 7, expectedStatus: 200 },
    ],
  },
};

// Main execution
async function main() {
  const scenario = process.argv[2] || 'development';
  const config = scenarios[scenario as keyof typeof scenarios];
  
  if (!config) {
    console.error(`❌ Unknown scenario: ${scenario}`);
    console.log('Available scenarios:', Object.keys(scenarios).join(', '));
    process.exit(1);
  }
  
  console.log(`\n🎯 Running ${scenario.toUpperCase()} load test...`);
  
  const tester = new LoadTester(config);
  const results = await tester.run();
  
  // Save results to file
  const resultsFile = `load-test-results-${scenario}-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  // Exit with appropriate code
  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  const avgResponseTime = results.averageResponseTime;
  
  if (successRate >= 95 && avgResponseTime < 5000) {
    console.log('\n✅ Load test PASSED - Ready for production');
    process.exit(0);
  } else if (successRate >= 90 && avgResponseTime < 10000) {
    console.log('\n⚠️  Load test WARNING - Needs monitoring');
    process.exit(0);
  } else {
    console.log('\n❌ Load test FAILED - Requires optimization');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LoadTester, scenarios };