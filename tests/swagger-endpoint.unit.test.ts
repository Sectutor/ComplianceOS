/**
 * Swagger UI Endpoint Tests
 * Tests the /api/docs and /api/spec static file serving without requiring DB or HTTP server.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';

const OPENAPI_DIR = path.join(process.cwd(), 'openapi');

describe('Swagger UI Static Assets', () => {
  it('swagger.html file should exist', () => {
    const filePath = path.join(OPENAPI_DIR, 'swagger.html');
    expect(existsSync(filePath)).toBe(true);
  });

  it('swagger.html should be a non-empty file', () => {
    const filePath = path.join(OPENAPI_DIR, 'swagger.html');
    const stats = statSync(filePath);
    expect(stats.size).toBeGreaterThan(500);
  });

  it('swagger.html should load Swagger UI from CDN', () => {
    const filePath = path.join(OPENAPI_DIR, 'swagger.html');
    const html = readFileSync(filePath, 'utf-8');
    expect(html).toContain('swagger-ui');
    expect(html).toContain('swagger-ui-bundle.js');
    expect(html).toContain('swagger-ui.css');
  });

  it('swagger.html should point to /api/spec', () => {
    const filePath = path.join(OPENAPI_DIR, 'swagger.html');
    const html = readFileSync(filePath, 'utf-8');
    expect(html).toContain('/api/spec');
    expect(html).toContain('SwaggerUIBundle');
  });

  it('swagger.html should be valid HTML structure', () => {
    const filePath = path.join(OPENAPI_DIR, 'swagger.html');
    const html = readFileSync(filePath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<div id="swagger-ui">');
    expect(html).toContain('</body>');
  });

  it('api-v1.yaml should exist', () => {
    const filePath = path.join(OPENAPI_DIR, 'api-v1.yaml');
    expect(existsSync(filePath)).toBe(true);
  });

  it('api-v1.yaml should be a substantial file', () => {
    const filePath = path.join(OPENAPI_DIR, 'api-v1.yaml');
    const stats = statSync(filePath);
    expect(stats.size).toBeGreaterThan(5000);
  });

  it('api-v1.yaml should contain the API title', () => {
    const filePath = path.join(OPENAPI_DIR, 'api-v1.yaml');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('ComplianceOS API v1');
    expect(content).toContain('openapi: 3.0.3');
  });

  it('api-v1.yaml should document core endpoints', () => {
    const filePath = path.join(OPENAPI_DIR, 'api-v1.yaml');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('/health');
    expect(content).toContain('/controls');
    expect(content).toContain('/evidence');
    expect(content).toContain('/risks');
    expect(content).toContain('/incidents');
    expect(content).toContain('/vendors');
    expect(content).toContain('/tasks');
  });

  it('schemas.yaml should exist', () => {
    const filePath = path.join(OPENAPI_DIR, 'schemas.yaml');
    expect(existsSync(filePath)).toBe(true);
  });

  it('schemas.yaml should contain component schemas', () => {
    const filePath = path.join(OPENAPI_DIR, 'schemas.yaml');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('components:');
    expect(content).toContain('schemas:');
    expect(content).toContain('Client:');
    expect(content).toContain('Control:');
    expect(content).toContain('Evidence:');
    expect(content).toContain('Risk:');
  });

  it('api-v1.yaml should have proper path structure', () => {
    const filePath = path.join(OPENAPI_DIR, 'api-v1.yaml');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('paths:');
    // Verify paths have method definitions
    expect(content).toContain('get:');
    expect(content).toContain('post:');
  });

  it('server_entry.ts should reference /api/docs endpoint', () => {
    const filePath = path.join(process.cwd(), 'server_entry.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain("'/api/docs'");
    expect(content).toContain("'/api/spec'");
    expect(content).toContain('swagger.html');
    expect(content).toContain('api-v1.yaml');
  });
});
