import { getDb } from "./client";
import * as schema from "@/db/schema";
import { eq, and, desc, asc, isNull, inArray } from "drizzle-orm";
import { store } from "./store";
import type {
  Buyer,
  Unit,
  User,
  Order,
  OrderLine,
  OrderStage,
  MilestoneDateHistory,
  DailyUpdate,
  Photo,
  Warning,
  BuyerLink,
  TnaTemplate,
  TnaTemplateItem,
} from "./types";
import crypto from "crypto";

export function toUuid(str: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  const h = crypto.createHash("md5").update(str).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function assertNotProductionFallback(): void {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error(
      "CRITICAL DATABASE ERROR: DATABASE_URL is missing in production. Falling back to the in-memory store in production is strictly forbidden."
    );
  }
}

// -------------------------------------------------------------
// Users
// -------------------------------------------------------------
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()));
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role as User["role"],
        buyerId: u.buyerId || undefined,
        unitId: u.unitId || undefined,
        locale: u.locale as User["locale"],
        active: u.active,
        createdAt: u.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getUserByEmail(email);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role as User["role"],
        buyerId: u.buyerId || undefined,
        unitId: u.unitId || undefined,
        locale: u.locale as User["locale"],
        active: u.active,
        createdAt: u.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getUserById(id);
}

// -------------------------------------------------------------
// Buyers
// -------------------------------------------------------------
export async function getBuyers(): Promise<Buyer[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.buyers);
    return rows.map((b) => ({
      id: b.id,
      name: b.name,
      country: b.country,
      createdAt: b.createdAt.toISOString(),
    }));
  }
  assertNotProductionFallback();
  return store.getBuyers();
}

export async function getBuyerById(id: string): Promise<Buyer | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.buyers).where(eq(schema.buyers.id, id));
    if (rows.length > 0) {
      const b = rows[0];
      return {
        id: b.id,
        name: b.name,
        country: b.country,
        createdAt: b.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getBuyerById(id);
}

// -------------------------------------------------------------
// Units
// -------------------------------------------------------------
export async function getUnits(): Promise<Unit[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.units);
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      type: u.type as Unit["type"],
      stagesSupported: u.stagesSupported as string[],
      createdAt: u.createdAt.toISOString(),
    }));
  }
  assertNotProductionFallback();
  return store.getUnits();
}

export async function getUnitById(id: string): Promise<Unit | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.units).where(eq(schema.units.id, id));
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        name: u.name,
        type: u.type as Unit["type"],
        stagesSupported: u.stagesSupported as string[],
        createdAt: u.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getUnitById(id);
}

// -------------------------------------------------------------
// Templates
// -------------------------------------------------------------
export async function getTemplates(): Promise<TnaTemplate[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.tnaTemplates);
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt.toISOString(),
    }));
  }
  assertNotProductionFallback();
  return store.getTemplates();
}

export async function getTemplateItems(templateId: string): Promise<TnaTemplateItem[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.tnaTemplateItems)
      .where(eq(schema.tnaTemplateItems.templateId, templateId))
      .orderBy(asc(schema.tnaTemplateItems.seq));
    return rows.map((item) => ({
      id: item.id,
      templateId: item.templateId,
      stage: item.stage,
      seq: item.seq,
      offsetDaysBeforeExfactory: item.offsetDaysBeforeExfactory,
      plannedDurationDays: item.plannedDurationDays,
    }));
  }
  assertNotProductionFallback();
  return store.getTemplateItems(templateId);
}

// -------------------------------------------------------------
// Orders & Lines & Stages
// -------------------------------------------------------------
export async function getOrders(): Promise<Order[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.orders);
    return rows.map((o) => ({
      id: o.id,
      poNo: o.poNo,
      buyerId: o.buyerId,
      style: o.style,
      status: o.status as Order["status"],
      exFactoryDate: o.exFactoryDate,
      originalExFactoryDate: o.originalExFactoryDate,
      templateId: o.templateId || undefined,
      createdBy: o.createdBy,
      createdAt: o.createdAt.toISOString(),
    }));
  }
  assertNotProductionFallback();
  return store.getOrders();
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (rows.length > 0) {
      const o = rows[0];
      return {
        id: o.id,
        poNo: o.poNo,
        buyerId: o.buyerId,
        style: o.style,
        status: o.status as Order["status"],
        exFactoryDate: o.exFactoryDate,
        originalExFactoryDate: o.originalExFactoryDate,
        templateId: o.templateId || undefined,
        createdBy: o.createdBy,
        createdAt: o.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getOrderById(id);
}

export async function getOrderByBuyerAndPo(buyerId: string, poNo: string): Promise<Order | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.buyerId, buyerId), eq(schema.orders.poNo, poNo)));
    if (rows.length > 0) {
      const o = rows[0];
      return {
        id: o.id,
        poNo: o.poNo,
        buyerId: o.buyerId,
        style: o.style,
        status: o.status as Order["status"],
        exFactoryDate: o.exFactoryDate,
        originalExFactoryDate: o.originalExFactoryDate,
        templateId: o.templateId || undefined,
        createdBy: o.createdBy,
        createdAt: o.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getOrderByBuyerAndPo(buyerId, poNo);
}

export async function getOrderLines(orderId: string): Promise<OrderLine[]> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, orderId));
    return rows.map((l) => ({
      id: l.id,
      orderId: l.orderId,
      colour: l.colour,
      size: l.size,
      qty: l.qty,
    }));
  }
  assertNotProductionFallback();
  return store.getOrderLines(orderId);
}

export async function getOrderLinesByOrderIds(orderIds: string[]): Promise<Map<string, OrderLine[]>> {
  const map = new Map<string, OrderLine[]>();
  if (orderIds.length === 0) return map;

  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.orderLines)
      .where(inArray(schema.orderLines.orderId, orderIds));

    for (const l of rows) {
      const line: OrderLine = {
        id: l.id,
        orderId: l.orderId,
        colour: l.colour,
        size: l.size,
        qty: l.qty,
      };
      const arr = map.get(l.orderId);
      if (arr) {
        arr.push(line);
      } else {
        map.set(l.orderId, [line]);
      }
    }
    return map;
  }
  assertNotProductionFallback();
  return store.getOrderLinesByOrderIds(orderIds);
}

export async function getOrderStages(orderId: string): Promise<OrderStage[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.orderStages)
      .where(eq(schema.orderStages.orderId, orderId))
      .orderBy(asc(schema.orderStages.seq));
    return rows.map((s) => ({
      id: s.id,
      orderId: s.orderId,
      stage: s.stage,
      seq: s.seq,
      unitId: s.unitId,
      targetQty: s.targetQty,
      plannedStart: s.plannedStart,
      plannedEnd: s.plannedEnd,
      currentEnd: s.currentEnd,
      actualEnd: s.actualEnd || undefined,
    }));
  }
  assertNotProductionFallback();
  return store.getOrderStages(orderId);
}

export async function getOrderStagesByOrderIds(orderIds: string[]): Promise<Map<string, OrderStage[]>> {
  const map = new Map<string, OrderStage[]>();
  if (orderIds.length === 0) return map;

  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.orderStages)
      .where(inArray(schema.orderStages.orderId, orderIds))
      .orderBy(asc(schema.orderStages.seq));

    for (const s of rows) {
      const stage: OrderStage = {
        id: s.id,
        orderId: s.orderId,
        stage: s.stage,
        seq: s.seq,
        unitId: s.unitId,
        targetQty: s.targetQty,
        plannedStart: s.plannedStart,
        plannedEnd: s.plannedEnd,
        currentEnd: s.currentEnd,
        actualEnd: s.actualEnd || undefined,
      };
      const arr = map.get(s.orderId);
      if (arr) {
        arr.push(stage);
      } else {
        map.set(s.orderId, [stage]);
      }
    }
    return map;
  }
  assertNotProductionFallback();
  return store.getOrderStagesByOrderIds(orderIds);
}

export async function getOrderStageById(stageId: string): Promise<OrderStage | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.orderStages).where(eq(schema.orderStages.id, stageId));
    if (rows.length > 0) {
      const s = rows[0];
      return {
        id: s.id,
        orderId: s.orderId,
        stage: s.stage,
        seq: s.seq,
        unitId: s.unitId,
        targetQty: s.targetQty,
        plannedStart: s.plannedStart,
        plannedEnd: s.plannedEnd,
        currentEnd: s.currentEnd,
        actualEnd: s.actualEnd || undefined,
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getOrderStageById(stageId);
}

export async function createOrder(params: {
  poNo: string;
  buyerId: string;
  style: string;
  exFactoryDate: string;
  templateId?: string;
  createdBy: string;
  lines: Array<{ colour: string; size: string; qty: number }>;
  stages: Array<{
    stage: string;
    seq: number;
    unitId: string;
    targetQty: number;
    plannedStart: string;
    plannedEnd: string;
  }>;
}): Promise<Order> {
  const db = getDb();
  if (db) {
    const existing = await getOrderByBuyerAndPo(params.buyerId, params.poNo);
    if (existing) {
      throw new Error(`PO ${params.poNo} already exists for this buyer.`);
    }

    const orderId = crypto.randomUUID();
    const [insertedOrder] = await db
      .insert(schema.orders)
      .values({
        id: orderId,
        poNo: params.poNo,
        buyerId: params.buyerId,
        style: params.style,
        status: "open",
        exFactoryDate: params.exFactoryDate,
        originalExFactoryDate: params.exFactoryDate,
        templateId: params.templateId,
        createdBy: params.createdBy,
      })
      .returning();

    for (const line of params.lines) {
      await db.insert(schema.orderLines).values({
        orderId,
        colour: line.colour,
        size: line.size,
        qty: line.qty,
      });
    }

    for (const stage of params.stages) {
      await db.insert(schema.orderStages).values({
        orderId,
        stage: stage.stage,
        seq: stage.seq,
        unitId: stage.unitId,
        targetQty: stage.targetQty,
        plannedStart: stage.plannedStart,
        plannedEnd: stage.plannedEnd,
        currentEnd: stage.plannedEnd,
      });
    }

    return {
      id: insertedOrder.id,
      poNo: insertedOrder.poNo,
      buyerId: insertedOrder.buyerId,
      style: insertedOrder.style,
      status: insertedOrder.status as Order["status"],
      exFactoryDate: insertedOrder.exFactoryDate,
      originalExFactoryDate: insertedOrder.originalExFactoryDate,
      templateId: insertedOrder.templateId || undefined,
      createdBy: insertedOrder.createdBy,
      createdAt: insertedOrder.createdAt.toISOString(),
    };
  }
  assertNotProductionFallback();
  return store.createOrder(params);
}

// -------------------------------------------------------------
// Milestone & Date Changes
// -------------------------------------------------------------
export async function updateOrderExFactoryDate(params: {
  orderId: string;
  newDate: string;
  reason: string;
  changedBy: string;
}): Promise<Order> {
  if (!params.reason || params.reason.trim() === "") {
    throw new Error("Reason is required for ex-factory date adjustment.");
  }
  const db = getDb();
  if (db) {
    const order = await getOrderById(params.orderId);
    if (!order) throw new Error("Order not found");

    const oldDate = order.exFactoryDate;
    await db
      .update(schema.orders)
      .set({ exFactoryDate: params.newDate })
      .where(eq(schema.orders.id, params.orderId));

    await db.insert(schema.milestoneDateHistory).values({
      orderId: order.id,
      field: "ex_factory_date",
      oldDate,
      newDate: params.newDate,
      reason: params.reason,
      changedBy: params.changedBy,
    });

    order.exFactoryDate = params.newDate;
    return order;
  }
  assertNotProductionFallback();
  return store.updateOrderExFactoryDate(params);
}

export async function updateStageDate(params: {
  stageId: string;
  newEnd: string;
  reason: string;
  changedBy: string;
}): Promise<OrderStage> {
  if (!params.reason || params.reason.trim() === "") {
    throw new Error("Reason is required for stage date adjustment.");
  }
  const db = getDb();
  if (db) {
    const stage = await getOrderStageById(params.stageId);
    if (!stage) throw new Error("Order stage not found");

    const oldDate = stage.currentEnd;
    await db
      .update(schema.orderStages)
      .set({ currentEnd: params.newEnd })
      .where(eq(schema.orderStages.id, params.stageId));

    await db.insert(schema.milestoneDateHistory).values({
      orderId: stage.orderId,
      orderStageId: stage.id,
      field: "current_end",
      oldDate,
      newDate: params.newEnd,
      reason: params.reason,
      changedBy: params.changedBy,
    });

    stage.currentEnd = params.newEnd;
    return stage;
  }
  assertNotProductionFallback();
  return store.updateStageDate(params);
}

export async function getMilestoneHistory(orderId: string): Promise<MilestoneDateHistory[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.milestoneDateHistory)
      .where(eq(schema.milestoneDateHistory.orderId, orderId))
      .orderBy(desc(schema.milestoneDateHistory.changedAt));
    return rows.map((h) => ({
      id: h.id,
      orderId: h.orderId,
      orderStageId: h.orderStageId || undefined,
      field: h.field as MilestoneDateHistory["field"],
      oldDate: h.oldDate,
      newDate: h.newDate,
      reason: h.reason,
      changedBy: h.changedBy,
      changedAt: h.changedAt.toISOString(),
    }));
  }
  assertNotProductionFallback();
  return store.getMilestoneHistory(orderId);
}

// -------------------------------------------------------------
// Daily Updates
// -------------------------------------------------------------
export async function getDailyUpdatesForStage(stageId: string): Promise<DailyUpdate[]> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.dailyUpdates)
      .where(eq(schema.dailyUpdates.orderStageId, stageId));
    return rows.map((u) => ({
      id: u.id,
      clientUuid: u.clientUuid,
      orderStageId: u.orderStageId,
      unitId: u.unitId,
      reportedDate: u.reportedDate,
      qty: u.qty,
      noteOriginal: u.noteOriginal || undefined,
      noteLang: (u.noteLang as DailyUpdate["noteLang"]) || undefined,
      noteEn: u.noteEn || undefined,
      reasonCategory: u.reasonCategory || undefined,
      aiConfidence: u.aiConfidence || undefined,
      categorySource: (u.categorySource as DailyUpdate["categorySource"]) || undefined,
      categoryChangedBy: u.categoryChangedBy || undefined,
      photoId: u.photoId || undefined,
      submittedBy: u.submittedBy,
      clientTs: u.clientTs.toISOString(),
      receivedAt: u.receivedAt.toISOString(),
      isCorrection: u.isCorrection,
    }));
  }
  assertNotProductionFallback();
  return store.getDailyUpdatesForStage(stageId);
}

export async function getDailyUpdatesByStageIds(stageIds: string[]): Promise<Map<string, DailyUpdate[]>> {
  const map = new Map<string, DailyUpdate[]>();
  if (stageIds.length === 0) return map;

  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.dailyUpdates)
      .where(inArray(schema.dailyUpdates.orderStageId, stageIds));

    for (const u of rows) {
      const update: DailyUpdate = {
        id: u.id,
        clientUuid: u.clientUuid,
        orderStageId: u.orderStageId,
        unitId: u.unitId,
        reportedDate: u.reportedDate,
        qty: u.qty,
        noteOriginal: u.noteOriginal || undefined,
        noteLang: (u.noteLang as DailyUpdate["noteLang"]) || undefined,
        noteEn: u.noteEn || undefined,
        reasonCategory: u.reasonCategory || undefined,
        aiConfidence: u.aiConfidence || undefined,
        categorySource: (u.categorySource as DailyUpdate["categorySource"]) || undefined,
        categoryChangedBy: u.categoryChangedBy || undefined,
        photoId: u.photoId || undefined,
        submittedBy: u.submittedBy,
        clientTs: u.clientTs.toISOString(),
        receivedAt: u.receivedAt.toISOString(),
        isCorrection: u.isCorrection,
      };
      const arr = map.get(u.orderStageId);
      if (arr) {
        arr.push(update);
      } else {
        map.set(u.orderStageId, [update]);
      }
    }
    return map;
  }
  assertNotProductionFallback();
  return store.getDailyUpdatesByStageIds(stageIds);
}

export async function getDailyUpdatesForOrder(orderId: string): Promise<DailyUpdate[]> {
  const db = getDb();
  if (db) {
    const stages = await getOrderStages(orderId);
    if (stages.length === 0) return [];
    const stageIds = stages.map((s) => s.id);
    const rows = await db
      .select()
      .from(schema.dailyUpdates)
      .where(inArray(schema.dailyUpdates.orderStageId, stageIds))
      .orderBy(asc(schema.dailyUpdates.reportedDate));
    return rows.map((u) => ({
      id: u.id,
      clientUuid: u.clientUuid,
      orderStageId: u.orderStageId,
      unitId: u.unitId,
      reportedDate: u.reportedDate,
      qty: u.qty,
      noteOriginal: u.noteOriginal || undefined,
      noteLang: (u.noteLang as DailyUpdate["noteLang"]) || undefined,
      noteEn: u.noteEn || undefined,
      reasonCategory: u.reasonCategory || undefined,
      aiConfidence: u.aiConfidence || undefined,
      categorySource: (u.categorySource as DailyUpdate["categorySource"]) || undefined,
      categoryChangedBy: u.categoryChangedBy || undefined,
      photoId: u.photoId || undefined,
      submittedBy: u.submittedBy,
      clientTs: u.clientTs.toISOString(),
      receivedAt: u.receivedAt.toISOString(),
      isCorrection: u.isCorrection,
    }));
  }
  assertNotProductionFallback();
  return store.getDailyUpdatesForOrder(orderId);
}

export async function getDailyUpdateByClientUuid(clientUuid: string): Promise<DailyUpdate | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.dailyUpdates)
      .where(eq(schema.dailyUpdates.clientUuid, clientUuid));
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        clientUuid: u.clientUuid,
        orderStageId: u.orderStageId,
        unitId: u.unitId,
        reportedDate: u.reportedDate,
        qty: u.qty,
        noteOriginal: u.noteOriginal || undefined,
        noteLang: (u.noteLang as DailyUpdate["noteLang"]) || undefined,
        noteEn: u.noteEn || undefined,
        reasonCategory: u.reasonCategory || undefined,
        aiConfidence: u.aiConfidence || undefined,
        categorySource: (u.categorySource as DailyUpdate["categorySource"]) || undefined,
        categoryChangedBy: u.categoryChangedBy || undefined,
        photoId: u.photoId || undefined,
        submittedBy: u.submittedBy,
        clientTs: u.clientTs.toISOString(),
        receivedAt: u.receivedAt.toISOString(),
        isCorrection: u.isCorrection,
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getDailyUpdateByClientUuid(clientUuid);
}

export async function addDailyUpdate(update: Omit<DailyUpdate, "id" | "receivedAt">): Promise<{
  status: "created" | "duplicate";
  record: DailyUpdate;
}> {
  const db = getDb();
  if (db) {
    const existing = await getDailyUpdateByClientUuid(update.clientUuid);
    if (existing) {
      return { status: "duplicate", record: existing };
    }

    const [inserted] = await db
      .insert(schema.dailyUpdates)
      .values({
        clientUuid: update.clientUuid,
        orderStageId: update.orderStageId,
        unitId: update.unitId,
        reportedDate: update.reportedDate,
        qty: update.qty,
        noteOriginal: update.noteOriginal,
        noteLang: update.noteLang as any,
        noteEn: update.noteEn,
        reasonCategory: update.reasonCategory,
        aiConfidence: update.aiConfidence,
        categorySource: update.categorySource as any,
        categoryChangedBy: update.categoryChangedBy,
        photoId: update.photoId,
        submittedBy: update.submittedBy,
        clientTs: new Date(update.clientTs),
        isCorrection: update.isCorrection ?? false,
      })
      .returning();

    const record: DailyUpdate = {
      id: inserted.id,
      clientUuid: inserted.clientUuid,
      orderStageId: inserted.orderStageId,
      unitId: inserted.unitId,
      reportedDate: inserted.reportedDate,
      qty: inserted.qty,
      noteOriginal: inserted.noteOriginal || undefined,
      noteLang: (inserted.noteLang as DailyUpdate["noteLang"]) || undefined,
      noteEn: inserted.noteEn || undefined,
      reasonCategory: inserted.reasonCategory || undefined,
      aiConfidence: inserted.aiConfidence || undefined,
      categorySource: (inserted.categorySource as DailyUpdate["categorySource"]) || undefined,
      categoryChangedBy: inserted.categoryChangedBy || undefined,
      photoId: inserted.photoId || undefined,
      submittedBy: inserted.submittedBy,
      clientTs: inserted.clientTs.toISOString(),
      receivedAt: inserted.receivedAt.toISOString(),
      isCorrection: inserted.isCorrection,
    };

    return { status: "created", record };
  }
  assertNotProductionFallback();
  return store.addDailyUpdate(update);
}

export async function overrideUpdateCategory(params: {
  updateId: string;
  category: string;
  changedBy: string;
}): Promise<DailyUpdate> {
  const db = getDb();
  if (db) {
    const rows = await db
      .update(schema.dailyUpdates)
      .set({
        reasonCategory: params.category,
        categorySource: "human",
        categoryChangedBy: params.changedBy,
      })
      .where(eq(schema.dailyUpdates.id, params.updateId))
      .returning();

    if (rows.length === 0) throw new Error("Update not found");
    const u = rows[0];

    await logAudit(params.changedBy, "override_category", "daily_updates", params.updateId, {
      newCategory: params.category,
    });

    return {
      id: u.id,
      clientUuid: u.clientUuid,
      orderStageId: u.orderStageId,
      unitId: u.unitId,
      reportedDate: u.reportedDate,
      qty: u.qty,
      noteOriginal: u.noteOriginal || undefined,
      noteLang: (u.noteLang as DailyUpdate["noteLang"]) || undefined,
      noteEn: u.noteEn || undefined,
      reasonCategory: u.reasonCategory || undefined,
      aiConfidence: u.aiConfidence || undefined,
      categorySource: (u.categorySource as DailyUpdate["categorySource"]) || undefined,
      categoryChangedBy: u.categoryChangedBy || undefined,
      photoId: u.photoId || undefined,
      submittedBy: u.submittedBy,
      clientTs: u.clientTs.toISOString(),
      receivedAt: u.receivedAt.toISOString(),
      isCorrection: u.isCorrection,
    };
  }
  assertNotProductionFallback();
  return store.overrideUpdateCategory(params);
}

// -------------------------------------------------------------
// Photos
// -------------------------------------------------------------
export async function getPhotosForOrder(orderId: string, buyerOnly: boolean = false): Promise<Photo[]> {
  const db = getDb();
  if (db) {
    const conditions = [eq(schema.photos.orderId, orderId)];
    if (buyerOnly) conditions.push(eq(schema.photos.visibleToBuyer, true));

    const rows = await db
      .select()
      .from(schema.photos)
      .where(and(...conditions))
      .orderBy(desc(schema.photos.takenAt));

    return rows.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      storageKey: p.storageKey,
      mimeType: p.mimeType,
      sizeBytes: p.sizeBytes || undefined,
      uploadedBy: p.uploadedBy,
      takenAt: p.takenAt.toISOString(),
      visibleToBuyer: p.visibleToBuyer,
    }));
  }
  assertNotProductionFallback();
  return store.getPhotosForOrder(orderId, buyerOnly);
}

export async function getPhotoById(id: string): Promise<Photo | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.id, id));
    if (rows.length > 0) {
      const p = rows[0];
      return {
        id: p.id,
        orderId: p.orderId,
        storageKey: p.storageKey,
        imageData: (p.imageData as Buffer) || undefined,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes || undefined,
        uploadedBy: p.uploadedBy,
        takenAt: p.takenAt.toISOString(),
        visibleToBuyer: p.visibleToBuyer,
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getPhotoById(id);
}

export async function addPhoto(photo: Omit<Photo, "id" | "takenAt">): Promise<Photo> {
  const db = getDb();
  if (db) {
    const [p] = await db
      .insert(schema.photos)
      .values({
        orderId: photo.orderId,
        storageKey: photo.storageKey,
        imageData: photo.imageData || null,
        mimeType: photo.mimeType || "image/jpeg",
        sizeBytes: photo.sizeBytes || (photo.imageData ? photo.imageData.length : null),
        uploadedBy: photo.uploadedBy,
        visibleToBuyer: photo.visibleToBuyer ?? true,
      })
      .returning();
    return {
      id: p.id,
      orderId: p.orderId,
      storageKey: p.storageKey,
      imageData: (p.imageData as Buffer) || undefined,
      mimeType: p.mimeType,
      sizeBytes: p.sizeBytes || undefined,
      uploadedBy: p.uploadedBy,
      takenAt: p.takenAt.toISOString(),
      visibleToBuyer: p.visibleToBuyer,
    };
  }
  assertNotProductionFallback();
  return store.addPhoto(photo);
}

// -------------------------------------------------------------
// Warnings
// -------------------------------------------------------------
export async function getWarnings(status?: Warning["status"]): Promise<Warning[]> {
  const db = getDb();
  if (db) {
    let query = db.select().from(schema.warnings);
    const rows = status
      ? await query.where(eq(schema.warnings.status, status as any))
      : await query;
    return rows.map((w) => ({
      id: w.id,
      orderId: w.orderId,
      orderStageId: w.orderStageId,
      status: w.status as Warning["status"],
      requiredRate: w.requiredRate,
      actualRate: w.actualRate,
      remaining: w.remaining,
      daysAvailable: w.daysAvailable,
      slipDays: w.slipDays,
      mathSnapshot: w.mathSnapshot as Record<string, any>,
      createdAt: w.createdAt.toISOString(),
      decidedBy: w.decidedBy || undefined,
      decidedAt: w.decidedAt ? w.decidedAt.toISOString() : undefined,
      dismissReason: w.dismissReason || undefined,
    }));
  }
  assertNotProductionFallback();
  return store.getWarnings(status);
}

export async function getWarningById(id: string): Promise<Warning | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db.select().from(schema.warnings).where(eq(schema.warnings.id, id));
    if (rows.length > 0) {
      const w = rows[0];
      return {
        id: w.id,
        orderId: w.orderId,
        orderStageId: w.orderStageId,
        status: w.status as Warning["status"],
        requiredRate: w.requiredRate,
        actualRate: w.actualRate,
        remaining: w.remaining,
        daysAvailable: w.daysAvailable,
        slipDays: w.slipDays,
        mathSnapshot: w.mathSnapshot as Record<string, any>,
        createdAt: w.createdAt.toISOString(),
        decidedBy: w.decidedBy || undefined,
        decidedAt: w.decidedAt ? w.decidedAt.toISOString() : undefined,
        dismissReason: w.dismissReason || undefined,
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getWarningById(id);
}

export async function getWarningsForOrder(orderId: string, buyerOnly: boolean = false): Promise<Warning[]> {
  const db = getDb();
  if (db) {
    const conditions = [eq(schema.warnings.orderId, orderId)];
    if (buyerOnly) conditions.push(eq(schema.warnings.status, "confirmed"));

    const rows = await db
      .select()
      .from(schema.warnings)
      .where(and(...conditions));

    return rows.map((w) => ({
      id: w.id,
      orderId: w.orderId,
      orderStageId: w.orderStageId,
      status: w.status as Warning["status"],
      requiredRate: w.requiredRate,
      actualRate: w.actualRate,
      remaining: w.remaining,
      daysAvailable: w.daysAvailable,
      slipDays: w.slipDays,
      mathSnapshot: w.mathSnapshot as Record<string, any>,
      createdAt: w.createdAt.toISOString(),
      decidedBy: w.decidedBy || undefined,
      decidedAt: w.decidedAt ? w.decidedAt.toISOString() : undefined,
      dismissReason: w.dismissReason || undefined,
    }));
  }
  assertNotProductionFallback();
  return store.getWarningsForOrder(orderId, buyerOnly);
}

export async function confirmWarning(warningId: string, decidedBy: string): Promise<Warning> {
  const db = getDb();
  if (db) {
    const now = new Date();
    const [w] = await db
      .update(schema.warnings)
      .set({
        status: "confirmed",
        decidedBy,
        decidedAt: now,
      })
      .where(eq(schema.warnings.id, warningId))
      .returning();

    if (!w) throw new Error("Warning not found");

    const order = await getOrderById(w.orderId);
    if (order) {
      await db.insert(schema.notifications).values({
        buyerId: order.buyerId,
        warningId: w.id,
        channel: "email",
        payload: {
          poNo: order.poNo,
          slipDays: w.slipDays,
          requiredRate: w.requiredRate,
          actualRate: w.actualRate,
        },
      });
    }

    return {
      id: w.id,
      orderId: w.orderId,
      orderStageId: w.orderStageId,
      status: w.status as Warning["status"],
      requiredRate: w.requiredRate,
      actualRate: w.actualRate,
      remaining: w.remaining,
      daysAvailable: w.daysAvailable,
      slipDays: w.slipDays,
      mathSnapshot: w.mathSnapshot as Record<string, any>,
      createdAt: w.createdAt.toISOString(),
      decidedBy: w.decidedBy || undefined,
      decidedAt: w.decidedAt ? w.decidedAt.toISOString() : undefined,
      dismissReason: w.dismissReason || undefined,
    };
  }
  assertNotProductionFallback();
  return store.confirmWarning(warningId, decidedBy);
}

export async function dismissWarning(
  warningId: string,
  decidedBy: string,
  dismissReason: string
): Promise<Warning> {
  if (!dismissReason || dismissReason.trim() === "") {
    throw new Error("Dismiss reason is required.");
  }
  const db = getDb();
  if (db) {
    const now = new Date();
    const [w] = await db
      .update(schema.warnings)
      .set({
        status: "dismissed",
        decidedBy,
        decidedAt: now,
        dismissReason,
      })
      .where(eq(schema.warnings.id, warningId))
      .returning();

    if (!w) throw new Error("Warning not found");

    return {
      id: w.id,
      orderId: w.orderId,
      orderStageId: w.orderStageId,
      status: w.status as Warning["status"],
      requiredRate: w.requiredRate,
      actualRate: w.actualRate,
      remaining: w.remaining,
      daysAvailable: w.daysAvailable,
      slipDays: w.slipDays,
      mathSnapshot: w.mathSnapshot as Record<string, any>,
      createdAt: w.createdAt.toISOString(),
      decidedBy: w.decidedBy || undefined,
      decidedAt: w.decidedAt ? w.decidedAt.toISOString() : undefined,
      dismissReason: w.dismissReason || undefined,
    };
  }
  assertNotProductionFallback();
  return store.dismissWarning(warningId, decidedBy, dismissReason);
}

// -------------------------------------------------------------
// Buyer Links
// -------------------------------------------------------------
export async function getBuyerLinkByTokenHash(tokenHash: string): Promise<BuyerLink | undefined> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(schema.buyerLinks)
      .where(and(eq(schema.buyerLinks.tokenHash, tokenHash), isNull(schema.buyerLinks.revokedAt)));
    if (rows.length > 0) {
      const l = rows[0];
      return {
        id: l.id,
        buyerId: l.buyerId,
        tokenHash: l.tokenHash,
        expiresAt: l.expiresAt.toISOString(),
        revokedAt: l.revokedAt ? l.revokedAt.toISOString() : undefined,
        createdBy: l.createdBy,
        createdAt: l.createdAt.toISOString(),
      };
    }
    return undefined;
  }
  assertNotProductionFallback();
  return store.getBuyerLinkByTokenHash(tokenHash);
}

export async function createBuyerLink(
  buyerId: string,
  tokenHash: string,
  expiresAt: string,
  createdBy: string
): Promise<BuyerLink> {
  const db = getDb();
  if (db) {
    const [l] = await db
      .insert(schema.buyerLinks)
      .values({
        buyerId,
        tokenHash,
        expiresAt: new Date(expiresAt),
        createdBy,
      })
      .returning();
    return {
      id: l.id,
      buyerId: l.buyerId,
      tokenHash: l.tokenHash,
      expiresAt: l.expiresAt.toISOString(),
      revokedAt: l.revokedAt ? l.revokedAt.toISOString() : undefined,
      createdBy: l.createdBy,
      createdAt: l.createdAt.toISOString(),
    };
  }
  assertNotProductionFallback();
  return store.createBuyerLink(buyerId, tokenHash, expiresAt, createdBy);
}

export async function revokeBuyerLink(linkId: string): Promise<boolean> {
  const db = getDb();
  if (db) {
    const rows = await db
      .update(schema.buyerLinks)
      .set({ revokedAt: new Date() })
      .where(eq(schema.buyerLinks.id, linkId))
      .returning();
    return rows.length > 0;
  }
  assertNotProductionFallback();
  return store.revokeBuyerLink(linkId);
}

// -------------------------------------------------------------
// Audit Log
// -------------------------------------------------------------
export async function logAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  meta?: any
) {
  const db = getDb();
  if (db) {
    try {
      await db.insert(schema.auditLog).values({
        actorId: actorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId) ? actorId : null,
        action,
        entity,
        entityId,
        meta: meta || null,
      });
    } catch {
      // audit logging should not break caller
    }
    return;
  }
  assertNotProductionFallback();
  store.logAudit(actorId, action, entity, entityId, meta);
}
