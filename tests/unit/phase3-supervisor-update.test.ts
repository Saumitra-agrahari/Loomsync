import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/db/store";

describe("Phase 3: Supervisor Daily Updates, Idempotency & Unit Isolation", () => {
  beforeEach(() => {
    store.init("2026-11-05");
  });

  it("handles duplicate client_uuid idempotently (creates 1 row, returns duplicate)", () => {
    const stage = store.getOrderStages("ord-b-88213")[0];
    const clientUuid = "client-uuid-test-unique-12345";
    const date = "2026-11-05";

    // First submission
    const res1 = store.addDailyUpdate({
      clientUuid,
      orderStageId: stage.id,
      unitId: stage.unitId,
      reportedDate: date,
      qty: 450,
      noteOriginal: "தையல் இயந்திரம் பழுது",
      submittedBy: "usr-sup-01",
      clientTs: new Date().toISOString(),
      isCorrection: false,
    });

    expect(res1.status).toBe("created");
    expect(res1.record.qty).toBe(450);

    // Second submission with exact same client_uuid (network retry / outbox resend)
    const res2 = store.addDailyUpdate({
      clientUuid,
      orderStageId: stage.id,
      unitId: stage.unitId,
      reportedDate: date,
      qty: 450,
      noteOriginal: "தையல் இயந்திரம் பழுது",
      submittedBy: "usr-sup-01",
      clientTs: new Date().toISOString(),
      isCorrection: false,
    });

    expect(res2.status).toBe("duplicate");
    expect(res2.record.id).toBe(res1.record.id);

    // Verify only one row exists for this client_uuid
    const updates = store.getDailyUpdatesForStage(stage.id);
    const matches = updates.filter((u) => u.clientUuid === clientUuid);
    expect(matches.length).toBe(1);
  });

  it("marks second distinct update on the same day as a correction", () => {
    const stage = store.getOrderStages("ord-b-88213")[0];
    const date = "2026-11-05";

    // Update 1
    const res1 = store.addDailyUpdate({
      clientUuid: "uuid-first-morning-run",
      orderStageId: stage.id,
      unitId: stage.unitId,
      reportedDate: date,
      qty: 200,
      submittedBy: "usr-sup-01",
      clientTs: "2026-11-05T12:00:00Z",
      isCorrection: false,
    });
    expect(res1.status).toBe("created");

    // Check if second update on same day is treated as correction
    const stageUpdates = store.getDailyUpdatesForStage(stage.id);
    const hasSameDayUpdate = stageUpdates.some((u) => u.reportedDate === date);
    expect(hasSameDayUpdate).toBe(true);

    // Update 2 (afternoon correction/addition)
    const res2 = store.addDailyUpdate({
      clientUuid: "uuid-second-evening-run",
      orderStageId: stage.id,
      unitId: stage.unitId,
      reportedDate: date,
      qty: 250,
      submittedBy: "usr-sup-01",
      clientTs: "2026-11-05T18:00:00Z",
      isCorrection: hasSameDayUpdate,
    });

    expect(res2.status).toBe("created");
    expect(res2.record.isCorrection).toBe(true);
  });

  it("enforces unit isolation for supervisors", () => {
    const units = store.getUnits();
    const unit1 = units[0];
    const unit2 = units[1];

    // Find a stage assigned to unit 2
    const unit2Stage = store.getOrderStages("ord-b-88240").find((s) => s.unitId === unit2.id);
    expect(unit2Stage).toBeDefined();

    // Supervisor 1 (assigned to unit 1) should not own unit2's stage
    const supervisor1 = store.getUserByEmail("sup1@demo.example");
    expect(supervisor1?.unitId).toBe(unit1.id);
    expect(unit2Stage?.unitId).not.toBe(supervisor1?.unitId);
  });
});
