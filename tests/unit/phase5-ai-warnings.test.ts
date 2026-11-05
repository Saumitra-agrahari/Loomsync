import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/db/store";
import { keywordFallbackClassifier, reasonCategoryEnum } from "@/lib/ai/classifier";

describe("Phase 5: AI Classifier, Review & Warning Lifecycle", () => {
  beforeEach(() => {
    store.init("2026-11-05");
  });

  describe("Keyword Fallback Classification (Tamil & English)", () => {
    it("correctly classifies Tamil floor notes with source=fallback", () => {
      // 1. Machine breakdown: "தையல் இயந்திரம் பழுதாகிவிட்டது"
      const res1 = keywordFallbackClassifier("தையல் இயந்திரம் பழுதாகிவிட்டது");
      expect(res1.category).toBe("machine_breakdown");
      expect(res1.source).toBe("fallback");
      expect(res1.confidence).toBeGreaterThanOrEqual(0.6);

      // 2. Material shortage: "துணி இன்னும் வரவில்லை"
      const res2 = keywordFallbackClassifier("துணி இன்னும் வரவில்லை");
      expect(res2.category).toBe("material_shortage");
      expect(res2.source).toBe("fallback");

      // 3. Manpower shortage: "இன்று ஆட்கள் குறைவு"
      const res3 = keywordFallbackClassifier("இன்று ஆட்கள் குறைவு");
      expect(res3.category).toBe("manpower_shortage");
      expect(res3.source).toBe("fallback");

      // 4. Power cut: "மின்சாரம் இல்லை"
      const res4 = keywordFallbackClassifier("மின்சாரம் இல்லை");
      expect(res4.category).toBe("power_cut");
      expect(res4.source).toBe("fallback");
    });

    it("handles unclear or noisy text by assigning category unclear", () => {
      const res = keywordFallbackClassifier("Random gibberish text 123456");
      expect(res.category).toBe("unclear");
      expect(res.confidence).toBeLessThan(0.6);
      expect(res.source).toBe("fallback");
    });

    it("validates all categories match reasonCategoryEnum", () => {
      const sampleOutputs = [
        "machine_breakdown",
        "material_shortage",
        "manpower_shortage",
        "power_cut",
        "quality_rework",
        "buyer_approval_pending",
        "subcontractor_delay",
        "other",
        "unclear",
      ];
      for (const cat of sampleOutputs) {
        expect(reasonCategoryEnum.safeParse(cat).success).toBe(true);
      }
    });
  });

  describe("Warning Lifecycle & Buyer Isolation", () => {
    it("keeps draft warnings invisible to buyer until merchandiser confirms", () => {
      const redOrderId = "ord-b-88240";

      // 1. Check draft warning exists for merchandiser view
      const allWarnings = store.getWarningsForOrder(redOrderId, false);
      expect(allWarnings.length).toBeGreaterThanOrEqual(1);
      const draft = allWarnings[0];
      expect(draft.status).toBe("draft");

      // 2. Buyer view (buyerOnly = true): draft warning MUST be invisible!
      const buyerVisibleWarningsBefore = store.getWarningsForOrder(redOrderId, true);
      expect(buyerVisibleWarningsBefore.length).toBe(0);

      // 3. Merchandiser confirms warning
      const confirmed = store.confirmWarning(draft.id, "usr-merch-01");
      expect(confirmed.status).toBe("confirmed");
      expect(confirmed.decidedBy).toBe("usr-merch-01");

      // 4. Now buyer view MUST see the confirmed warning!
      const buyerVisibleWarningsAfter = store.getWarningsForOrder(redOrderId, true);
      expect(buyerVisibleWarningsAfter.length).toBe(1);
      expect(buyerVisibleWarningsAfter[0].id).toBe(draft.id);

      // 5. Mock notification is sent to buyer
      const notifs = store.getNotificationsForBuyer("b1111111-0000-0000-0000-000000000001");
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].warningId).toBe(draft.id);
    });

    it("requires reason when dismissing a warning; dismissed warnings stay invisible to buyer", () => {
      const redOrderId = "ord-b-88240";
      const draft = store.getWarningsForOrder(redOrderId, false)[0];

      // Missing dismiss reason should fail
      expect(() => {
        store.dismissWarning(draft.id, "usr-merch-01", "");
      }).toThrow(/reason is required/i);

      // Dismiss with valid reason
      const dismissed = store.dismissWarning(
        draft.id,
        "usr-merch-01",
        "Supervisor added overtime shift to recover the 40/day shortfall"
      );
      expect(dismissed.status).toBe("dismissed");
      expect(dismissed.dismissReason).toContain("overtime");

      // Invisible to buyer
      const buyerVisible = store.getWarningsForOrder(redOrderId, true);
      expect(buyerVisible.length).toBe(0);
    });

    it("allows merchandiser to override AI category and marks source as human without destroying original note", () => {
      const updates = store.getDailyUpdatesForOrder("ord-b-88240");
      const targetUpdate = updates[0];
      const originalText = targetUpdate.noteOriginal;

      store.overrideUpdateCategory({
        updateId: targetUpdate.id,
        category: "power_cut",
        changedBy: "usr-merch-01",
      });

      const updated = store.getDailyUpdatesForOrder("ord-b-88240")[0];
      expect(updated.reasonCategory).toBe("power_cut");
      expect(updated.categorySource).toBe("human");
      expect(updated.categoryChangedBy).toBe("usr-merch-01");
      // Original text preserved!
      expect(updated.noteOriginal).toBe(originalText);
    });
  });
});
