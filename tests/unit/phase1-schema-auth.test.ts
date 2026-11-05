import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/db/store";
import { signSession, verifySession, hashToken } from "@/lib/auth/session";
import bcrypt from "bcryptjs";

describe("Phase 1: Schema, Migrations, Seed & Auth", () => {
  beforeEach(() => {
    store.init("2026-11-05");
  });

  describe("Seed Data Integrity", () => {
    it("seeds 3 core sample orders plus invented orders (11 total)", () => {
      const orders = store.getOrders();
      expect(orders.length).toBeGreaterThanOrEqual(11);

      const po88213 = orders.find((o) => o.poNo === "B-PO-88213");
      const po88240 = orders.find((o) => o.poNo === "B-PO-88240");
      const po0488 = orders.find((o) => o.poNo === "C-PO-0488");

      expect(po88213).toBeDefined();
      expect(po88240).toBeDefined();
      expect(po0488).toBeDefined();

      expect(po88213?.style).toBe("Men's crew neck tee, navy");
      expect(po88240?.style).toBe("Men's polo, white");
      expect(po0488?.style).toBe("Kids printed tee, yellow");
    });

    it("seeds 3 own units and 2 subcontractors", () => {
      const units = store.getUnits();
      expect(units.length).toBe(5);

      const ownUnits = units.filter((u) => u.type === "own");
      const subUnits = units.filter((u) => u.type === "subcontract");

      expect(ownUnits.length).toBe(3);
      expect(subUnits.length).toBe(2);
    });

    it("seeds 14 days of update history with Tamil floor notes", () => {
      const updates = store.getDailyUpdatesForOrder("ord-b-88240");
      expect(updates.length).toBeGreaterThanOrEqual(10);

      // Verify at least one Tamil note exists
      const tamilNotes = updates.filter(
        (u) => u.noteOriginal && /[\u0B80-\u0BFF]/.test(u.noteOriginal)
      );
      expect(tamilNotes.length).toBeGreaterThan(0);
    });

    it("seeds date changes with reasons in append-only milestone history", () => {
      const history = store.getMilestoneHistory("ord-b-88240");
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].field).toBe("ex_factory_date");
      expect(history[0].reason).toContain("Fabric shade variation");
    });
  });

  describe("Authentication and Roles", () => {
    it("verifies demo user passwords with bcrypt", () => {
      const merch = store.getUserByEmail("merch@demo.example");
      expect(merch).toBeDefined();
      expect(bcrypt.compareSync("Demo@12345", merch!.passwordHash)).toBe(true);
      expect(bcrypt.compareSync("WrongPassword", merch!.passwordHash)).toBe(false);
    });

    it("signs and verifies valid session tokens", () => {
      const payload = {
        userId: "usr-merch-01",
        email: "merch@demo.example",
        name: "Murugan Selvam",
        role: "merchandiser" as const,
        locale: "en" as const,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = signSession(payload);
      const verified = verifySession(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("usr-merch-01");
      expect(verified?.role).toBe("merchandiser");
    });

    it("rejects tampered session tokens", () => {
      const payload = {
        userId: "usr-merch-01",
        email: "merch@demo.example",
        name: "Murugan Selvam",
        role: "merchandiser" as const,
        locale: "en" as const,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = signSession(payload);
      const tampered = token.slice(0, -3) + "xyz";
      expect(verifySession(tampered)).toBeNull();
    });

    it("hashes buyer token link correctly", () => {
      const rawToken = "demo-buyer-b-token-1234567890";
      const hashed = hashToken(rawToken);
      const link = store.getBuyerLinkByTokenHash(hashed);
      expect(link).toBeDefined();
      expect(link?.buyerId).toBe("b1111111-0000-0000-0000-000000000001");
    });
  });
});
