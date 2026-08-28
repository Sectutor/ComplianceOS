/**
 * OpenAPI Spec Validation Tests
 * Validates the structure and completeness of the OpenAPI specification.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const SPEC_PATH = path.join(process.cwd(), 'openapi', 'api-v1.yaml');
const SCHEMAS_PATH = path.join(process.cwd(), 'openapi', 'schemas.yaml');

describe('OpenAPI Spec', () => {
  let spec: any;
  let schemas: any;

  it('should load and parse api-v1.yaml as valid YAML', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    expect(() => {
      spec = yaml.load(raw);
    }).not.toThrow();
    expect(spec).toBeDefined();
  });

  it('should load and parse schemas.yaml as valid YAML', () => {
    const raw = readFileSync(SCHEMAS_PATH, 'utf-8');
    expect(() => {
      schemas = yaml.load(raw);
    }).not.toThrow();
    expect(schemas).toBeDefined();
  });

  it('should have required OpenAPI 3.0 fields', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    spec = yaml.load(raw);
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('ComplianceOS API v1');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.paths).toBeDefined();
  });

  it('should document at least 40 endpoints (path+method combinations)', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    spec = yaml.load(raw);
    let endpointCount = 0;
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];
    for (const pathObj of Object.values(spec.paths as Record<string, any>)) {
      for (const method of httpMethods) {
        if ((pathObj as any)[method]) {
          endpointCount++;
        }
      }
    }
    expect(endpointCount).toBeGreaterThanOrEqual(40);
  });

  it('should have all paths with at least one response defined', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    spec = yaml.load(raw);
    for (const [pathKey, pathObj] of Object.entries(spec.paths as Record<string, any>)) {
      for (const [method, operation] of Object.entries(pathObj as Record<string, any>)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          expect((operation as any).responses, `Path ${pathKey} ${method} missing responses`).toBeDefined();
          expect(Object.keys((operation as any).responses).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should have tags grouping endpoints', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    spec = yaml.load(raw);
    expect(spec.tags).toBeDefined();
    expect(spec.tags.length).toBeGreaterThanOrEqual(10);
    const tagNames = spec.tags.map((t: any) => t.name);
    expect(tagNames).toContain('Controls');
    expect(tagNames).toContain('Evidence');
    expect(tagNames).toContain('Risks');
    expect(tagNames).toContain('Incidents');
  });

  it('should have reusable response components', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    spec = yaml.load(raw);
    expect(spec.components.responses).toBeDefined();
    expect(spec.components.responses.BadRequest).toBeDefined();
    expect(spec.components.responses.NotFound).toBeDefined();
    expect(spec.components.responses.InternalError).toBeDefined();
  });

  it('should have security scheme defined', () => {
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    spec = yaml.load(raw);
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth.type).toBe('apiKey');
    expect(spec.components.securitySchemes.ApiKeyAuth.name).toBe('x-api-key');
  });
});

describe('OpenAPI Schemas', () => {
  it('should have at least 10 component schemas', () => {
    const raw = readFileSync(SCHEMAS_PATH, 'utf-8');
    const schemas = yaml.load(raw);
    const schemaNames = Object.keys(schemas.components.schemas);
    expect(schemaNames.length).toBeGreaterThanOrEqual(10);
  });

  it('should have core entity schemas', () => {
    const raw = readFileSync(SCHEMAS_PATH, 'utf-8');
    const schemas = yaml.load(raw);
    const schemaNames = Object.keys(schemas.components.schemas);
    expect(schemaNames).toContain('Client');
    expect(schemaNames).toContain('Control');
    expect(schemaNames).toContain('Evidence');
    expect(schemaNames).toContain('Risk');
    expect(schemaNames).toContain('Vendor');
    expect(schemaNames).toContain('Incident');
    expect(schemaNames).toContain('ErrorResponse');
  });

  it('should have all schemas with type object', () => {
    const raw = readFileSync(SCHEMAS_PATH, 'utf-8');
    const schemas = yaml.load(raw);
    for (const [name, schema] of Object.entries(schemas.components.schemas as Record<string, any>)) {
      expect(schema.type, `Schema ${name} should have type`).toBe('object');
    }
  });
});
