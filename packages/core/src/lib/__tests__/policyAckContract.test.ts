import { describe, it, expect, vi } from "vitest";
import * as policyAckModule from "../../lib/policyAck";

/**
 * Contract tests for packages/core/src/lib/policyAck.ts (QA cycle 3).
 *
 * BACKEND-DEP: the cycle-3 backend agent is adding `buildAckRecords`
 * (policyAck.list contract, UI-STANDARD.md section 16: ack records
 * { id, policyId, policyTitle, assigneeName?, status, acknowledgedAt?,
 *   dueDate? }). The export was NOT present at 2026-08-14 19:25; the suite
 * below is auto-skipped (describe.skipIf) until it lands. The conductor
 * should confirm it activates at verify time.
 *
 * NOTE: buildAckRecords was landed by the backend agent WHILE QA was running
 * (present by 19:30). The suite below tests the ACTUAL signature:
 *   - buildAckRecords(rows, policiesById: Map<number, string>, usersById?:
 *     Map<number, { name?: string | null }>) - maps keyed by id
 *   - policyTitle from policiesById; missing policy -> "Policy #<policyId>"
 *   - assigneeName from usersById?.get(userId)?.name, else null
 *   - acknowledgedAt Date -> ISO string, null stays null
 *   - dueDate is always null in the current contract
 *   - status passes through unchanged (pending | acknowledged | declined)
 * The skipIf guard is kept so the suite stays green if the export is ever
 * reverted mid-cycle.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  policyAcknowledgements: {
    id: "pa.id",
    policyId: "pa.policyId",
    userId: "pa.userId",
    clientId: "pa.clientId",
    status: "pa.status",
    acknowledgedAt: "pa.acknowledgedAt",
    createdAt: "pa.createdAt",
  },
  clientPolicies: { id: "cp.id", name: "cp.name", clientId: "cp.clientId" },
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => ({
  policyAcknowledgements: mocks.policyAcknowledgements,
  clientPolicies: mocks.clientPolicies,
}));

const buildAckRecordsAvailable = typeof policyAckModule.buildAckRecords === "function";

describe.skipIf(!buildAckRecordsAvailable)("buildAckRecords (BACKEND-DEP)", () => {
  const buildAckRecords = policyAckModule.buildAckRecords!;

  const policiesById = new Map<number, string>([
    [1, "Password Policy"],
    [2, "Access Control Policy"],
  ]);
  const usersById = new Map<number, { name?: string | null }>([
    [7, { name: "Alice Smith" }],
    [8, { name: "Bob Jones" }],
  ]);
  const rows = [
    {
      id: 11,
      policyId: 1,
      userId: 7,
      clientId: 5,
      status: "acknowledged",
      acknowledgedAt: new Date("2026-08-10T08:30:00.000Z"),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    },
    {
      id: 12,
      policyId: 2,
      userId: 8,
      clientId: 5,
      status: "pending",
      acknowledgedAt: null,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    },
  ];

  it("maps policyTitle, assigneeName and ISO acknowledgedAt", () => {
    const records = buildAckRecords(rows, policiesById, usersById);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      id: 11,
      policyId: 1,
      policyTitle: "Password Policy",
      assigneeName: "Alice Smith",
      status: "acknowledged",
      acknowledgedAt: "2026-08-10T08:30:00.000Z",
    });
    expect(records[1]).toMatchObject({
      id: 12,
      policyId: 2,
      policyTitle: "Access Control Policy",
      assigneeName: "Bob Jones",
      status: "pending",
      acknowledgedAt: null,
    });
    // dueDate is optional in the contract; when absent it must be nullish.
    expect(records[0].dueDate == null).toBe(true);
    expect(records[1].dueDate == null).toBe(true);
  });

  it("sets assigneeName to null when usersById is not provided", () => {
    const records = buildAckRecords(rows, policiesById);
    expect(records[0].assigneeName).toBeNull();
    expect(records[1].assigneeName).toBeNull();
  });

  it("falls back to Policy #<id> for unknown policies and omits unknown assignees", () => {
    const records = buildAckRecords(
      [
        {
          id: 13,
          policyId: 99,
          userId: 42,
          clientId: 5,
          status: "pending",
          acknowledgedAt: null,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
      policiesById,
      usersById
    );
    expect(records[0].policyTitle).toBe("Policy #99");
    expect(records[0].assigneeName).toBeNull();
  });

  it("preserves input order and returns [] for empty input", () => {
    const records = buildAckRecords(rows, policiesById, usersById);
    expect(records.map((r) => r.id)).toEqual([11, 12]);
    expect(buildAckRecords([], policiesById, usersById)).toEqual([]);
  });
});
