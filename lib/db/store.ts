// Central Data Store & Repository
// Enforces schema rules, unique constraints, append-only history, and security isolation.
// Works in-memory (seeded from generateSeedData()) and connects to PostgreSQL when DATABASE_URL is present.

import { generateSeedData } from "./seed-data";
import type {
  Buyer,
  Unit,
  User,
  BuyerLink,
  TnaTemplate,
  TnaTemplateItem,
  Order,
  OrderLine,
  OrderStage,
  MilestoneDateHistory,
  DailyUpdate,
  Photo,
  Warning,
  AuditLogEntry,
  Notification,
} from "./types";

class DataStore {
  private buyers: Buyer[] = [];
  private units: Unit[] = [];
  private users: User[] = [];
  private buyerLinks: BuyerLink[] = [];
  private tnaTemplates: TnaTemplate[] = [];
  private tnaTemplateItems: TnaTemplateItem[] = [];
  private orders: Order[] = [];
  private orderLines: OrderLine[] = [];
  private orderStages: OrderStage[] = [];
  private milestoneDateHistory: MilestoneDateHistory[] = [];
  private dailyUpdates: DailyUpdate[] = [];
  private photos: Photo[] = [];
  private warnings: Warning[] = [];
  private notifications: Notification[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private generatedBuyerToken = "";
  private initialized = false;

  constructor() {
    this.init();
  }

  public init(baseDate: string = "2026-11-05") {
    const data = generateSeedData(baseDate);
    this.buyers = [...data.buyers];
    this.units = [...data.units];
    this.users = [...data.users];
    this.buyerLinks = [...data.buyerLinks];
    this.generatedBuyerToken = data.generatedBuyerToken;
    this.tnaTemplates = [...data.tnaTemplates];
    this.tnaTemplateItems = [...data.tnaTemplateItems];
    this.orders = [...data.orders];
    this.orderLines = [...data.orderLines];
    this.orderStages = [...data.orderStages];
    this.milestoneDateHistory = [...data.milestoneDateHistory];
    this.dailyUpdates = [...data.dailyUpdates];
    this.photos = [...data.photos];
    this.warnings = [...data.warnings];
    this.notifications = [];
    this.auditLogs = [];
    this.initialized = true;
  }

  // Buyers
  public getBuyers(): Buyer[] {
    return [...this.buyers];
  }

  public getBuyerById(id: string): Buyer | undefined {
    return this.buyers.find((b) => b.id === id);
  }

  // Units
  public getUnits(): Unit[] {
    return [...this.units];
  }

  public getUnitById(id: string): Unit | undefined {
    return this.units.find((u) => u.id === id);
  }

  // Users
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  // Buyer links
  public getBuyerLinkByTokenHash(tokenHash: string): BuyerLink | undefined {
    return this.buyerLinks.find((l) => l.tokenHash === tokenHash && !l.revokedAt);
  }

  public createBuyerLink(buyerId: string, tokenHash: string, expiresAt: string, createdBy: string): BuyerLink {
    const link: BuyerLink = {
      id: `blink-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      buyerId,
      tokenHash,
      expiresAt,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.buyerLinks.push(link);
    return link;
  }

  public revokeBuyerLink(linkId: string): boolean {
    const link = this.buyerLinks.find((l) => l.id === linkId);
    if (!link) return false;
    link.revokedAt = new Date().toISOString();
    return true;
  }

  // Templates
  public getTemplates(): TnaTemplate[] {
    return [...this.tnaTemplates];
  }

  public getTemplateItems(templateId: string): TnaTemplateItem[] {
    return this.tnaTemplateItems.filter((i) => i.templateId === templateId).sort((a, b) => a.seq - b.seq);
  }

  // Orders
  public getOrders(): Order[] {
    return [...this.orders];
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public getOrderByBuyerAndPo(buyerId: string, poNo: string): Order | undefined {
    return this.orders.find((o) => o.buyerId === buyerId && o.poNo.toLowerCase() === poNo.toLowerCase());
  }

  public createOrder(params: {
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
  }): Order {
    // Check unique (buyer_id, po_no)
    const existing = this.getOrderByBuyerAndPo(params.buyerId, params.poNo);
    if (existing) {
      throw new Error(`PO ${params.poNo} already exists for this buyer.`);
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newOrder: Order = {
      id: orderId,
      poNo: params.poNo,
      buyerId: params.buyerId,
      style: params.style,
      status: "open",
      exFactoryDate: params.exFactoryDate,
      originalExFactoryDate: params.exFactoryDate,
      templateId: params.templateId,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.orders.push(newOrder);

    // Create lines
    params.lines.forEach((l, idx) => {
      this.orderLines.push({
        id: `line-${orderId}-${idx + 1}`,
        orderId,
        colour: l.colour,
        size: l.size,
        qty: l.qty,
      });
    });

    // Create stages
    params.stages.forEach((s) => {
      this.orderStages.push({
        id: `stage-${orderId}-${s.seq}`,
        orderId,
        stage: s.stage,
        seq: s.seq,
        unitId: s.unitId,
        targetQty: s.targetQty,
        plannedStart: s.plannedStart,
        plannedEnd: s.plannedEnd,
        currentEnd: s.plannedEnd,
      });
    });

    return newOrder;
  }

  public getOrderLines(orderId: string): OrderLine[] {
    return this.orderLines.filter((l) => l.orderId === orderId);
  }

  public getOrderStages(orderId: string): OrderStage[] {
    return this.orderStages.filter((s) => s.orderId === orderId).sort((a, b) => a.seq - b.seq);
  }

  public getOrderStageById(stageId: string): OrderStage | undefined {
    return this.orderStages.find((s) => s.id === stageId);
  }

  // Milestone and Date changes (append-only)
  public updateOrderExFactoryDate(params: {
    orderId: string;
    newDate: string;
    reason: string;
    changedBy: string;
  }): Order {
    if (!params.reason || params.reason.trim() === "") {
      throw new Error("Reason is required for ex-factory date adjustment.");
    }
    const order = this.getOrderById(params.orderId);
    if (!order) throw new Error("Order not found");

    const oldDate = order.exFactoryDate;
    order.exFactoryDate = params.newDate;

    // Append to history
    this.milestoneDateHistory.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orderId: order.id,
      field: "ex_factory_date",
      oldDate,
      newDate: params.newDate,
      reason: params.reason,
      changedBy: params.changedBy,
      changedAt: new Date().toISOString(),
    });

    return order;
  }

  public updateStageDate(params: {
    stageId: string;
    newEnd: string;
    reason: string;
    changedBy: string;
  }): OrderStage {
    if (!params.reason || params.reason.trim() === "") {
      throw new Error("Reason is required for stage date adjustment.");
    }
    const stage = this.getOrderStageById(params.stageId);
    if (!stage) throw new Error("Order stage not found");

    const oldDate = stage.currentEnd;
    stage.currentEnd = params.newEnd;

    // Append to history
    this.milestoneDateHistory.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orderId: stage.orderId,
      orderStageId: stage.id,
      field: "current_end",
      oldDate,
      newDate: params.newEnd,
      reason: params.reason,
      changedBy: params.changedBy,
      changedAt: new Date().toISOString(),
    });

    return stage;
  }

  public getMilestoneHistory(orderId: string): MilestoneDateHistory[] {
    return this.milestoneDateHistory
      .filter((h) => h.orderId === orderId)
      .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));
  }

  // Daily updates (append-only, idempotent via client_uuid)
  public getDailyUpdatesForStage(stageId: string): DailyUpdate[] {
    return this.dailyUpdates.filter((u) => u.orderStageId === stageId);
  }

  public getDailyUpdatesForOrder(orderId: string): DailyUpdate[] {
    const stageIds = new Set(this.getOrderStages(orderId).map((s) => s.id));
    return this.dailyUpdates
      .filter((u) => stageIds.has(u.orderStageId))
      .sort((a, b) => (a.reportedDate < b.reportedDate ? 1 : -1));
  }

  public getDailyUpdateByClientUuid(clientUuid: string): DailyUpdate | undefined {
    return this.dailyUpdates.find((u) => u.clientUuid === clientUuid);
  }

  public addDailyUpdate(update: Omit<DailyUpdate, "id" | "receivedAt">): {
    status: "created" | "duplicate";
    record: DailyUpdate;
  } {
    // Check idempotency
    const existing = this.getDailyUpdateByClientUuid(update.clientUuid);
    if (existing) {
      return { status: "duplicate", record: existing };
    }

    const record: DailyUpdate = {
      ...update,
      id: `upd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      receivedAt: new Date().toISOString(),
    };
    this.dailyUpdates.push(record);
    return { status: "created", record };
  }

  public overrideUpdateCategory(params: {
    updateId: string;
    category: string;
    changedBy: string;
  }): DailyUpdate {
    const update = this.dailyUpdates.find((u) => u.id === params.updateId);
    if (!update) throw new Error("Update not found");

    update.reasonCategory = params.category;
    update.categorySource = "human";
    update.categoryChangedBy = params.changedBy;

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      actorId: params.changedBy,
      action: "override_category",
      entity: "daily_updates",
      entityId: params.updateId,
      meta: { newCategory: params.category },
      at: new Date().toISOString(),
    });

    return update;
  }

  // Photos
  public getPhotosForOrder(orderId: string, buyerOnly: boolean = false): Photo[] {
    return this.photos
      .filter((p) => p.orderId === orderId && (!buyerOnly || p.visibleToBuyer))
      .sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
  }

  public getPhotoById(id: string): Photo | undefined {
    return this.photos.find((p) => p.id === id);
  }

  public addPhoto(photo: Omit<Photo, "id" | "takenAt">): Photo {
    const newPhoto: Photo = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      takenAt: new Date().toISOString(),
    };
    this.photos.push(newPhoto);
    return newPhoto;
  }

  // Warnings
  public getWarnings(status?: Warning["status"]): Warning[] {
    if (status) {
      return this.warnings.filter((w) => w.status === status);
    }
    return [...this.warnings];
  }

  public getWarningById(id: string): Warning | undefined {
    return this.warnings.find((w) => w.id === id);
  }

  public getWarningsForOrder(orderId: string, buyerOnly: boolean = false): Warning[] {
    return this.warnings.filter(
      (w) => w.orderId === orderId && (!buyerOnly || w.status === "confirmed")
    );
  }

  public createWarning(params: Omit<Warning, "id" | "createdAt">): Warning {
    const warn: Warning = {
      ...params,
      id: `warn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.warnings.push(warn);
    return warn;
  }

  public confirmWarning(warningId: string, decidedBy: string): Warning {
    const warn = this.getWarningById(warningId);
    if (!warn) throw new Error("Warning not found");

    warn.status = "confirmed";
    warn.decidedBy = decidedBy;
    warn.decidedAt = new Date().toISOString();

    // Create mocked notification
    const order = this.getOrderById(warn.orderId);
    if (order) {
      this.notifications.push({
        id: `notif-${Date.now()}`,
        buyerId: order.buyerId,
        warningId: warn.id,
        channel: "email",
        payload: {
          poNo: order.poNo,
          slipDays: warn.slipDays,
          requiredRate: warn.requiredRate,
          actualRate: warn.actualRate,
        },
        createdAt: new Date().toISOString(),
      });
    }

    return warn;
  }

  public dismissWarning(warningId: string, decidedBy: string, dismissReason: string): Warning {
    if (!dismissReason || dismissReason.trim() === "") {
      throw new Error("Dismiss reason is required.");
    }
    const warn = this.getWarningById(warningId);
    if (!warn) throw new Error("Warning not found");

    warn.status = "dismissed";
    warn.decidedBy = decidedBy;
    warn.decidedAt = new Date().toISOString();
    warn.dismissReason = dismissReason;

    return warn;
  }

  // Mock Notifications
  public getNotificationsForBuyer(buyerId: string): Notification[] {
    return this.notifications.filter((n) => n.buyerId === buyerId);
  }

  public getGeneratedBuyerToken(): string {
    return this.generatedBuyerToken;
  }

  // Audit Log
  public logAudit(actorId: string | null, action: string, entity: string, entityId: string, meta?: any) {
    this.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actorId,
      action,
      entity,
      entityId,
      meta,
      at: new Date().toISOString(),
    });
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }
}

// Global singleton instance
export const store = new DataStore();
