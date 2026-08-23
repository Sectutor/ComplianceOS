import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseTextQuestions,
  parseDocumentBuffer,
  populateWorkbookInPlace,
} from '../questionnaire/excelPopulator';
import { generateQuestionAnswer } from '../ai/questionnaireAutoResponder';

describe('GRC Auto-Responder Knowledge Engine', () => {
  it('correctly maps MFA questions with contextual variables', () => {
    const res = generateQuestionAnswer('Is multi-factor authentication enforced for all users?', {
      companyName: 'Acme SaaS',
      idp: 'Okta & Google Workspace',
    });

    expect(res.shortAnswer).toBe('Yes');
    expect(res.answer).toContain('Multi-Factor Authentication');
    expect(res.answer).toContain('Okta & Google Workspace');
    expect(res.confidenceScore).toBeGreaterThanOrEqual(95);
    expect(res.policyCitation).toContain('Access Control');
  });

  it('correctly maps AES-256 encryption at rest questions', () => {
    const res = generateQuestionAnswer('Are database backups and disks encrypted at rest?', {
      companyName: 'Acme SaaS',
      cloudProvider: 'AWS (us-east-1)',
    });

    expect(res.shortAnswer).toBe('Yes');
    expect(res.answer).toContain('AES-256');
    expect(res.answer).toContain('AWS (us-east-1)');
  });

  it('correctly maps Penetration Testing questions', () => {
    const res = generateQuestionAnswer('Do you conduct annual penetration testing by independent third parties?', {
      companyName: 'Acme SaaS',
      pentestFrequency: 'Annual',
    });

    expect(res.shortAnswer).toBe('Yes');
    expect(res.answer).toContain('Penetration Test');
    expect(res.answer).toContain('ethical hackers');
  });
});

describe('Text / CSV Question Parsing', () => {
  it('parses plaintext numbered questions', () => {
    const rawText = `1. Does your organization enforce multi-factor authentication?
2. Are all databases encrypted at rest using AES-256?
3. What is your disaster recovery RTO and RPO SLA?`;

    const parsed = parseTextQuestions(rawText);
    expect(parsed.length).toBe(3);
    expect(parsed[0].question).toContain('multi-factor authentication');
    expect(parsed[1].question).toContain('encrypted at rest');
  });

  it('parses tab-separated pasted excel rows', () => {
    const rawTsv = `SEC-01\tAccess Control\tDo all administrative accounts require MFA?\nSEC-02\tEncryption\tAre all communication channels secured via TLS 1.2+?`;
    const parsed = parseTextQuestions(rawTsv);

    expect(parsed.length).toBe(2);
    expect(parsed[0].questionId).toBe('SEC-01');
    expect(parsed[0].question).toContain('MFA');
  });
});

describe('In-Place Excel Populator', () => {
  it('populates an Excel workbook in-place preserving sheets and cells', () => {
    // 1. Create a mock CAIQ workbook
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['ID', 'Category', 'Control Question', 'Response', 'Comments / Details'],
      ['Q1', 'Identity', 'Is MFA mandatory for all production systems?', '', ''],
      ['Q2', 'Encryption', 'Are customer data stores encrypted at rest using AES-256?', '', ''],
      ['Q3', 'BCP', 'What is your disaster recovery backup strategy and RPO/RTO?', '', ''],
      ['Q4', 'SDLC', 'Do you enforce peer code reviews and branch protection before merging?', '', ''],
      ['Q5', 'Assessment', 'Do you undergo annual third-party penetration testing?', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'CAIQ_Assessment');

    const wbBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const wbBase64 = wbBuffer.toString('base64');

    // 2. Run in-place population for Acme Corp
    const result = populateWorkbookInPlace(wbBase64, {
      companyName: 'Acme SaaS',
      cloudProvider: 'AWS',
      idp: 'Okta',
    });

    expect(result.success).toBe(true);
    expect(result.populatedCount).toBe(5);

    // 3. Inspect modified workbook
    const populatedBuf = Buffer.from(result.populatedBase64, 'base64');
    const populatedWb = XLSX.read(populatedBuf, { type: 'buffer' });
    const populatedWs = populatedWb.Sheets['CAIQ_Assessment'];
    const populatedRows: any[][] = XLSX.utils.sheet_to_json(populatedWs, { header: 1 });

    // Check Row 2 (Q1 - MFA)
    expect(populatedRows[1][3]).toBe('Yes'); // Response column
    expect(populatedRows[1][4]).toContain('Multi-Factor Authentication'); // Details column
    expect(populatedRows[1][4]).toContain('Okta');

    // Check Row 3 (Q2 - Encryption)
    expect(populatedRows[2][3]).toBe('Yes');
    expect(populatedRows[2][4]).toContain('AES-256');

    // Check Row 6 (Q5 - Pentest)
    expect(populatedRows[5][3]).toBe('Yes');
    expect(populatedRows[5][4]).toContain('Penetration Test');
  });

  it('respects maxQuestions parameter for the 25-Question Lead Magnet', () => {
    const wb = XLSX.utils.book_new();
    const rows = [['ID', 'Question', 'Response', 'Details']];
    for (let i = 1; i <= 50; i++) {
      rows.push([`Q${i}`, `Security Question #${i}: Is MFA enforced?`, '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Security_Review');

    const wbBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const result = populateWorkbookInPlace(
      wbBuffer.toString('base64'),
      { companyName: 'Acme' },
      { maxQuestions: 25 }
    );

    expect(result.populatedCount).toBe(25);
    expect(result.totalQuestions).toBe(50);
  });
});
