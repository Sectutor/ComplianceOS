/**
 * Trivy Vulnerability Scanner — Runner
 *
 * Runs Trivy scans against files, directories, or SBOMs.
 * Falls back to mock data when Trivy isn't installed.
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';

export interface TrivyScanConfig {
  /** Path to scan (file, directory, or SBOM) */
  target: string;
  /** Minimum severity to report (default: MEDIUM) */
  minSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Scan type */
  scanType?: 'fs' | 'sbom' | 'repo' | 'image' | 'rootfs';
  /** Timeout in seconds (default: 120) */
  timeout?: number;
}

export interface TrivyRawVuln {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion: string;
  Title: string;
  Description: string;
  Severity: string;
  PublishedDate: string;
  LastModifiedDate: string;
  References: string[];
  CVSS?: Record<string, { V3Score?: number; V3Vector?: string }>;
}

export interface TrivyRawResult {
  Target: string;
  Class: string;
  Type: string;
  Vulnerabilities?: TrivyRawVuln[];
}

export interface TrivyRawOutput {
  Results: TrivyRawResult[];
}

/**
 * Run a Trivy scan. Falls back to mock data if Trivy isn't installed.
 */
export async function runTrivyScan(
  config: TrivyScanConfig,
): Promise<TrivyRawOutput> {
  const trivyAvailable = await checkTrivy();

  if (!trivyAvailable) {
    console.warn('[Trivy] Trivy not installed, returning mock vulnerability data');
    return getMockOutput(config);
  }

  const timeout = (config.timeout ?? 120) * 1000;
  const severity = config.minSeverity ?? 'MEDIUM';
  const scanType = config.scanType ?? 'fs';

  try {
    const args = [
      scanType,
      '--format', 'json',
      '--severity', severity,
      '--quiet',
      config.target,
    ];

    console.log(`[Trivy] Running: trivy ${args.join(' ')}`);
    const startTime = Date.now();

    const stdout = execSync(`trivy ${args.join(' ')}`, {
      timeout,
      maxBuffer: 50 * 1024 * 1024,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Trivy] Scan completed in ${duration}s`);

    return JSON.parse(stdout.toString());
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new Error(
        `Trivy scan timed out after ${(timeout / 1000).toFixed(0)}s for "${config.target}"`,
      );
    }

    // If stderr has meaningful error, surface it
    const stderr = error.stderr?.toString() || '';
    if (stderr.includes('not found') || stderr.includes('no such file')) {
      throw new Error(
        `Scan target "${config.target}" not found. Check the path and try again.`,
      );
    }

    throw new Error(
      `Trivy scan failed for "${config.target}": ${error.message}`,
    );
  }
}

/**
 * Check if Trivy CLI is available.
 */
async function checkTrivy(): Promise<boolean> {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('trivy', ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        timeout: 2000,
      });
      const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')); }, 2000);
      let out = '';
      child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (code === 0 && out.trim()) resolve(out.trim());
        else reject(new Error(`exit ${code}`));
      });
      child.on('error', reject);
    });
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Generate mock Trivy output for development/testing.
 */
function getMockOutput(config: TrivyScanConfig): TrivyRawOutput {
  const targetName = config.target.split('/').pop() || config.target;

  return {
    Results: [
      {
        Target: targetName,
        Class: 'lang-pkgs',
        Type: 'npm',
        Vulnerabilities: [
          {
            VulnerabilityID: 'CVE-2024-12345',
            PkgName: 'lodash',
            InstalledVersion: '4.17.20',
            FixedVersion: '4.17.21',
            Title: 'Prototype Pollution in lodash',
            Description:
              'Prototype Pollution in lodash allows an attacker to inject properties into Object.prototype. This can lead to denial of service, data manipulation, or remote code execution in certain scenarios.',
            Severity: 'CRITICAL',
            PublishedDate: '2024-06-15T00:00:00Z',
            LastModifiedDate: '2024-07-01T00:00:00Z',
            References: [
              'https://nvd.nist.gov/vuln/detail/CVE-2024-12345',
              'https://github.com/lodash/lodash/issues/1234',
            ],
            CVSS: { nvd: { V3Score: 9.8, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' } },
          },
          {
            VulnerabilityID: 'CVE-2024-67890',
            PkgName: 'axios',
            InstalledVersion: '1.6.0',
            FixedVersion: '1.6.8',
            Title: 'Server-Side Request Forgery in axios',
            Description:
              'Axios before 1.6.8 allows SSRF via relative URLs in redirects. An attacker can make requests to internal network resources.',
            Severity: 'HIGH',
            PublishedDate: '2024-03-20T00:00:00Z',
            LastModifiedDate: '2024-04-05T00:00:00Z',
            References: [
              'https://nvd.nist.gov/vuln/detail/CVE-2024-67890',
            ],
            CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' } },
          },
          {
            VulnerabilityID: 'CVE-2024-11111',
            PkgName: 'express',
            InstalledVersion: '4.18.2',
            FixedVersion: '4.19.0',
            Title: 'Path Traversal in express.static',
            Description:
              'Path traversal vulnerability in express.static allows attackers to read arbitrary files outside the root directory.',
            Severity: 'HIGH',
            PublishedDate: '2024-02-10T00:00:00Z',
            LastModifiedDate: '2024-02-28T00:00:00Z',
            References: [
              'https://nvd.nist.gov/vuln/detail/CVE-2024-11111',
            ],
            CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' } },
          },
          {
            VulnerabilityID: 'CVE-2024-22222',
            PkgName: 'json5',
            InstalledVersion: '2.2.0',
            FixedVersion: '2.2.3',
            Title: 'Prototype Pollution in json5',
            Description:
              'json5 parse method incorrectly handles leading zeros in exponent parts of numbers, allowing prototype pollution.',
            Severity: 'MEDIUM',
            PublishedDate: '2024-01-05T00:00:00Z',
            LastModifiedDate: '2024-01-20T00:00:00Z',
            References: [
              'https://nvd.nist.gov/vuln/detail/CVE-2024-22222',
            ],
            CVSS: { nvd: { V3Score: 5.3, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N' } },
          },
          {
            VulnerabilityID: 'CVE-2024-33333',
            PkgName: 'minimist',
            InstalledVersion: '1.2.7',
            FixedVersion: '1.2.8',
            Title: 'Prototype Pollution in minimist',
            Description:
              'Prototype pollution in minimist allows attackers to inject arbitrary properties into Object.prototype via crafted arguments.',
            Severity: 'LOW',
            PublishedDate: '2024-01-20T00:00:00Z',
            LastModifiedDate: '2024-02-01T00:00:00Z',
            References: [
              'https://nvd.nist.gov/vuln/detail/CVE-2024-33333',
            ],
            CVSS: { nvd: { V3Score: 3.7, V3Vector: 'CVSS:3.1/AV:L/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N' } },
          },
        ],
      },
      {
        Target: 'Dockerfile',
        Class: 'config',
        Type: 'dockerfile',
        Vulnerabilities: [
          {
            VulnerabilityID: 'CVE-2024-44444',
            PkgName: 'node',
            InstalledVersion: '18-alpine',
            FixedVersion: '20-alpine',
            Title: 'Node.js Base Image Uses Outdated Version',
            Description:
              'The Dockerfile uses node:18-alpine as base image. Node 18 is end-of-life. Upgrade to node:20-alpine for security patches.',
            Severity: 'HIGH',
            PublishedDate: '2024-04-01T00:00:00Z',
            LastModifiedDate: '2024-04-15T00:00:00Z',
            References: ['https://nodejs.org/en/blog/release/v20.0.0'],
            CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' } },
          },
        ],
      },
    ],
  };
}
