import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/db/store";
import { addDays } from "@/lib/runrate";

describe("Phase 2: Order Setup, TNA Milestones & Date Change Audit", () => {
  beforeEach(() => {
    store.init("2026-11-05");
  });

  it("creates an order with back-calculated milestone dates from TNA template", () => {
    const templates = store.getTemplates();
    expect(templates.length).toBeGreaterThan(0);
    const template = templates[0];
    const items = store.getTemplateItems(template.id);
    expect(items.length).toBe(5);

    const buyer = store.getBuyers()[0];
    const exFactoryDate = "2026-12-15";
    const totalQty = 5000;

    const stages = items.map((item) => ({
      stage: item.stage,
      seq: item.seq,
      unitId: store.getUnits()[0].id,
      targetQty: totalQty,
      plannedStart: addDays(exFactoryDate, -item.offsetDaysBeforeExfactory),
      plannedEnd: addDays(exFactoryDate, -(item.offsetDaysBeforeExfactory - item.plannedDurationDays)),
    }));

    const order = store.createOrder({
      poNo: "PO-TEST-001",
      buyerId: buyer.id,
      style: "Test Style Polo",
      exFactoryDate,
      templateId: template.id,
      createdBy: "usr-merch-01",
      lines: [
        { colour: "Navy", size: "M", qty: 2500 },
        { colour: "Navy", size: "L", qty: 2500 },
      ],
      stages,
    });

    expect(order.id).toBeDefined();
    expect(order.poNo).toBe("PO-TEST-001");

    const orderStages = store.getOrderStages(order.id);
    expect(orderStages.length).toBe(5);

    // Cutting is 22 days before ex-factory
    const cutting = orderStages.find((s) => s.stage === "Cutting");
    expect(cutting).toBeDefined();
    expect(cutting?.plannedStart).toBe(addDays(exFactoryDate, -22));
    expect(cutting?.targetQty).toBe(5000);
  });

  it("blocks duplicate PO number for the same buyer", () => {
    const buyer = store.getBuyers()[0];
    const exFactoryDate = "2026-12-20";

    // Attempt to create an order with existing PO 'B-PO-88213'
    expect(() => {
      store.createOrder({
        poNo: "B-PO-88213",
        buyerId: buyer.id,
        style: "Duplicate PO Test",
        exFactoryDate,
        createdBy: "usr-merch-01",
        lines: [{ colour: "Black", size: "M", qty: 1000 }],
        stages: [],
      });
    }).toThrow(/already exists/);
  });

  it("requires a mandatory reason for changing ex-factory date", () => {
    const order = store.getOrders()[0];

    // Missing reason should throw
    expect(() => {
      store.updateOrderExFactoryDate({
        orderId: order.id,
        newDate: "2026-11-25",
        reason: "",
        changedBy: "usr-merch-01",
      });
    }).toThrow(/Reason is required/);

    expect(() => {
      store.updateOrderExFactoryDate({
        orderId: order.id,
        newDate: "2026-11-25",
        reason: "   ",
        changedBy: "usr-merch-01",
      });
    }).toThrow(/Reason is required/);
  });

  it("appends to milestone_date_history when date is changed with reason", () => {
    const order = store.getOrders()[0];
    const oldDate = order.exFactoryDate;
    const newDate = "2026-11-28";
    const reason = "Yarn dyeing delayed due to monsoon transport disruption";

    const initialHistoryCount = store.getMilestoneHistory(order.id).length;

    store.updateOrderExFactoryDate({
      orderId: order.id,
      newDate,
      reason,
      changedBy: "usr-merch-01",
    });

    const updatedOrder = store.getOrderById(order.id);
    expect(updatedOrder?.exFactoryDate).toBe(newDate);

    const history = store.getMilestoneHistory(order.id);
    expect(history.length).toBe(initialHistoryCount + 1);
    expect(history[0].oldDate).toBe(oldDate);
    expect(history[0].newDate).toBe(newDate);
    expect(history[0].reason).toBe(reason);
  });
});
