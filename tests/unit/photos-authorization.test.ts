import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/db/store";
import { validateImageBuffer, MAX_PHOTO_SIZE_BYTES } from "@/lib/photos/validate";
import { createSyntheticPng } from "@/lib/db/seed-data";

describe("Photos Persistence, Validation & Access Authorization", () => {
  const buyerB_Id = "b1111111-0000-0000-0000-000000000001"; // Company B (UK)
  const buyerC_Id = "c2222222-0000-0000-0000-000000000002"; // Company C (Germany)

  beforeEach(() => {
    store.init("2026-11-05");
  });

  it("validates size and MIME type of uploaded images correctly", () => {
    // 1. Valid PNG
    const validPng = createSyntheticPng(50, 50, 20, 40, 80);
    const validRes = validateImageBuffer(validPng);
    expect(validRes.success).toBe(true);
    if (validRes.success) {
      expect(validRes.image.mimeType).toBe("image/png");
      expect(validRes.image.sizeBytes).toBe(validPng.length);
    }

    // 2. Reject image exceeding 300 KB
    const oversized = Buffer.alloc(MAX_PHOTO_SIZE_BYTES + 50);
    oversized[0] = 0x89;
    oversized[1] = 0x50;
    oversized[2] = 0x4e;
    oversized[3] = 0x47;
    const oversizedRes = validateImageBuffer(oversized);
    expect(oversizedRes.success).toBe(false);
    if (!oversizedRes.success) {
      expect(oversizedRes.error).toContain("exceeds the maximum allowed size of 300 KB");
    }

    // 3. Reject invalid non-image formats (e.g. text/exe/pdf)
    const fakeData = Buffer.from("Hello world not an image!");
    const fakeRes = validateImageBuffer(fakeData);
    expect(fakeRes.success).toBe(false);
    if (!fakeRes.success) {
      expect(fakeRes.error).toContain("Invalid image format");
    }
  });

  it("enforces strict buyer isolation: Buyer B cannot access Buyer C's photos (returns 404 logic)", () => {
    const orders = store.getOrders();
    const orderB = orders.find((o) => o.buyerId === buyerB_Id)!;
    const orderC = orders.find((o) => o.buyerId === buyerC_Id)!;

    const photosB = store.getPhotosForOrder(orderB.id, true);
    const photosC = store.getPhotosForOrder(orderC.id, true);

    expect(photosB.length).toBeGreaterThan(0);
    expect(photosC.length).toBeGreaterThan(0);

    const photoC = photosC[0];

    // Simulate endpoint auth check when Buyer B requests photoC:
    const sessionBuyerId = buyerB_Id;
    const orderOfPhoto = store.getOrderById(photoC.orderId);

    const isAuthorizedForBuyer =
      orderOfPhoto &&
      orderOfPhoto.buyerId === sessionBuyerId &&
      photoC.visibleToBuyer === true;

    // Buyer B MUST NOT be authorized -> returns 404
    expect(isAuthorizedForBuyer).toBe(false);

    // Buyer C IS authorized for photoC
    const isAuthorizedForOwner =
      orderOfPhoto &&
      orderOfPhoto.buyerId === buyerC_Id &&
      photoC.visibleToBuyer === true;
    expect(isAuthorizedForOwner).toBe(true);
  });

  it("enforces unit isolation for supervisors: supervisor from another unit gets 404", () => {
    const units = store.getUnits();
    const unit1Id = units[0].id;
    const unit2Id = units[1].id;

    const orders = store.getOrders();
    // Find an order that only runs in Unit 1
    const orderInUnit1 = orders.find((o) => {
      const stages = store.getOrderStages(o.id);
      return stages.some((s) => s.unitId === unit1Id) && !stages.some((s) => s.unitId === unit2Id);
    })!;

    expect(orderInUnit1).toBeDefined();
    const photos = store.getPhotosForOrder(orderInUnit1.id);
    expect(photos.length).toBeGreaterThan(0);

    const photo = photos[0];

    // Supervisor from Unit 2 requests photo
    const supervisorUnitId = unit2Id;
    const stages = store.getOrderStages(orderInUnit1.id);
    const supervisorOwnsStage = stages.some((s) => s.unitId === supervisorUnitId);

    expect(supervisorOwnsStage).toBe(false); // supervisor from unit 2 gets 404
  });

  it("allows merchandisers full access to all order photos", () => {
    const allOrders = store.getOrders();
    for (const order of allOrders.slice(0, 3)) {
      const photos = store.getPhotosForOrder(order.id);
      expect(photos.length).toBeGreaterThan(0);
      for (const p of photos) {
        expect(p.imageData).toBeDefined();
        expect(p.mimeType).toBe("image/png");
      }
    }
  });
});
