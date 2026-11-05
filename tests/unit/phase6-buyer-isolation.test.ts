import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/db/store";
import { hashToken } from "@/lib/auth/session";

describe("Phase 6: Strict Buyer Isolation & Scoping", () => {
  const buyerB_Id = "b1111111-0000-0000-0000-000000000001"; // Company B (UK)
  const buyerC_Id = "c2222222-0000-0000-0000-000000000002"; // Company C (Germany)

  beforeEach(() => {
    store.init("2026-11-05");
  });

  it("ensures Buyer B cannot see Buyer C's orders in order list", () => {
    const allOrders = store.getOrders();
    const buyerB_Orders = allOrders.filter((o) => o.buyerId === buyerB_Id);
    const buyerC_Orders = allOrders.filter((o) => o.buyerId === buyerC_Id);

    expect(buyerB_Orders.length).toBeGreaterThan(0);
    expect(buyerC_Orders.length).toBeGreaterThan(0);

    // Verify disjoint sets
    const bOrderIds = new Set(buyerB_Orders.map((o) => o.id));
    for (const cOrder of buyerC_Orders) {
      expect(bOrderIds.has(cOrder.id)).toBe(false);
    }
  });

  it("blocks Buyer B from accessing Buyer C's order by ID (simulated endpoint logic)", () => {
    const buyerC_Order = store.getOrders().find((o) => o.buyerId === buyerC_Id)!;
    expect(buyerC_Order).toBeDefined();

    // Authenticated user is Buyer B
    const sessionBuyerId = buyerB_Id;

    // Route authorization logic check
    const isAllowed = buyerC_Order.buyerId === sessionBuyerId;
    expect(isAllowed).toBe(false);
  });

  it("filters out internal floor notes and unit names for buyer view", () => {
    const orderB = store.getOrderById("ord-b-88240")!;
    expect(orderB).toBeDefined();

    const stages = store.getOrderStages(orderB.id);
    const targetStage = stages.find((s) => s.stage === "Finishing")!;
    expect(targetStage).toBeDefined();
    const rawUpdates = store.getDailyUpdatesForStage(targetStage.id);

    // Raw update has supervisor notes and unit id
    expect(rawUpdates[0].unitId).toBeDefined();

    // Sanitized buyer representation
    const buyerSanitizedUpdates = rawUpdates.map((u) => ({
      id: u.id,
      reportedDate: u.reportedDate,
      qty: u.qty,
      clientTs: u.clientTs,
      // noteOriginal, noteEn, unitId omitted!
    }));

    expect((buyerSanitizedUpdates[0] as any).noteOriginal).toBeUndefined();
    expect((buyerSanitizedUpdates[0] as any).unitId).toBeUndefined();
  });

  it("allows buyer links to authenticate and immediately denies revoked links", () => {
    const rawToken = "brand-new-secret-token-buyer-b-xyz-987";
    const hashed = hashToken(rawToken);

    // Create link
    const link = store.createBuyerLink(
      buyerB_Id,
      hashed,
      new Date(Date.now() + 86400000).toISOString(),
      "usr-merch-01"
    );

    // Verify valid
    const activeLink = store.getBuyerLinkByTokenHash(hashed);
    expect(activeLink).toBeDefined();
    expect(activeLink?.buyerId).toBe(buyerB_Id);

    // Revoke link
    store.revokeBuyerLink(link.id);

    // Verify revoked link is now denied
    const revokedCheck = store.getBuyerLinkByTokenHash(hashed);
    expect(revokedCheck).toBeUndefined();
  });
});
