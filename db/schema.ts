import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["merchandiser", "supervisor", "buyer"]);
export const localeEnum = pgEnum("user_locale", ["en", "ta"]);
export const unitTypeEnum = pgEnum("unit_type", ["own", "subcontract"]);
export const orderStatusEnum = pgEnum("order_status", ["open", "shipped", "cancelled"]);
export const categorySourceEnum = pgEnum("category_source", ["ai", "fallback", "human"]);
export const warningStatusEnum = pgEnum("warning_status", ["draft", "confirmed", "dismissed"]);

// Buyers
export const buyers = pgTable("buyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Units
export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: unitTypeEnum("type").notNull().default("own"),
  stagesSupported: jsonb("stages_supported").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  buyerId: uuid("buyer_id").references(() => buyers.id, { onDelete: "restrict" }),
  unitId: uuid("unit_id").references(() => units.id, { onDelete: "restrict" }),
  locale: localeEnum("locale").notNull().default("en"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Buyer Links (tokens for read-only access)
export const buyerLinks = pgTable("buyer_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").references(() => buyers.id, { onDelete: "restrict" }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// TNA Templates
export const tnaTemplates = pgTable("tna_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tnaTemplateItems = pgTable("tna_template_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => tnaTemplates.id, { onDelete: "cascade" }).notNull(),
  stage: text("stage").notNull(),
  seq: integer("seq").notNull(),
  offsetDaysBeforeExfactory: integer("offset_days_before_exfactory").notNull(),
  plannedDurationDays: integer("planned_duration_days").notNull(),
});

// Orders
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poNo: text("po_no").notNull(),
    buyerId: uuid("buyer_id").references(() => buyers.id, { onDelete: "restrict" }).notNull(),
    style: text("style").notNull(),
    status: orderStatusEnum("status").notNull().default("open"),
    exFactoryDate: text("ex_factory_date").notNull(), // ISO YYYY-MM-DD
    originalExFactoryDate: text("original_ex_factory_date").notNull(),
    templateId: uuid("template_id").references(() => tnaTemplates.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    buyerPoIdx: uniqueIndex("orders_buyer_id_po_no_idx").on(table.buyerId, table.poNo),
    buyerExFactoryIdx: index("orders_buyer_ex_factory_idx").on(table.buyerId, table.exFactoryDate),
    statusIdx: index("orders_status_idx").on(table.status),
  })
);

// Order Lines (color x size)
export const orderLines = pgTable("order_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  colour: text("colour").notNull(),
  size: text("size").notNull(),
  qty: integer("qty").notNull(),
});

// Order Stages (TNA instance for an order)
export const orderStages = pgTable("order_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  stage: text("stage").notNull(),
  seq: integer("seq").notNull(),
  unitId: uuid("unit_id").references(() => units.id, { onDelete: "restrict" }).notNull(),
  targetQty: integer("target_qty").notNull(),
  plannedStart: text("planned_start").notNull(), // YYYY-MM-DD
  plannedEnd: text("planned_end").notNull(), // YYYY-MM-DD
  currentEnd: text("current_end").notNull(), // YYYY-MM-DD
  actualEnd: text("actual_end"), // YYYY-MM-DD nullable
});

// Milestone Date History (append-only)
export const milestoneDateHistory = pgTable("milestone_date_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }).notNull(),
  orderStageId: uuid("order_stage_id").references(() => orderStages.id, { onDelete: "restrict" }),
  field: text("field").notNull(), // 'ex_factory_date' or 'current_end'
  oldDate: text("old_date").notNull(),
  newDate: text("new_date").notNull(),
  reason: text("reason").notNull(),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
});

// Photos
export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }).notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }).defaultNow().notNull(),
  visibleToBuyer: boolean("visible_to_buyer").notNull().default(true),
});

// Daily Updates (append-only)
export const dailyUpdates = pgTable(
  "daily_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientUuid: text("client_uuid").notNull().unique(),
    orderStageId: uuid("order_stage_id").references(() => orderStages.id, { onDelete: "restrict" }).notNull(),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "restrict" }).notNull(),
    reportedDate: text("reported_date").notNull(), // YYYY-MM-DD
    qty: integer("qty").notNull(),
    noteOriginal: text("note_original"),
    noteLang: text("note_lang"),
    noteEn: text("note_en"),
    reasonCategory: text("reason_category"),
    aiConfidence: real("ai_confidence"),
    categorySource: categorySourceEnum("category_source"),
    categoryChangedBy: uuid("category_changed_by").references(() => users.id, { onDelete: "restrict" }),
    photoId: uuid("photo_id").references(() => photos.id, { onDelete: "restrict" }),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "restrict" }).notNull(),
    clientTs: timestamp("client_ts", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    isCorrection: boolean("is_correction").notNull().default(false),
  },
  (table) => ({
    stageDateIdx: index("daily_updates_stage_date_idx").on(table.orderStageId, table.reportedDate),
  })
);

// Warnings
export const warnings = pgTable(
  "warnings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }).notNull(),
    orderStageId: uuid("order_stage_id").references(() => orderStages.id, { onDelete: "restrict" }).notNull(),
    status: warningStatusEnum("status").notNull().default("draft"),
    requiredRate: real("required_rate").notNull(),
    actualRate: real("actual_rate").notNull(),
    remaining: integer("remaining").notNull(),
    daysAvailable: integer("days_available").notNull(),
    slipDays: integer("slip_days").notNull(),
    mathSnapshot: jsonb("math_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "restrict" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    dismissReason: text("dismiss_reason"),
  },
  (table) => ({
    orderStatusIdx: index("warnings_order_status_idx").on(table.orderId, table.status),
  })
);

// Notifications (mocked)
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").references(() => buyers.id, { onDelete: "restrict" }).notNull(),
  warningId: uuid("warning_id").references(() => warnings.id, { onDelete: "restrict" }),
  channel: text("channel").notNull(), // 'email', 'whatsapp'
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Audit Log
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const buyersRelations = relations(buyers, ({ many }) => ({
  orders: many(orders),
  buyerLinks: many(buyerLinks),
  users: many(users),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(buyers, { fields: [orders.buyerId], references: [buyers.id] }),
  template: one(tnaTemplates, { fields: [orders.templateId], references: [tnaTemplates.id] }),
  creator: one(users, { fields: [orders.createdBy], references: [users.id] }),
  lines: many(orderLines),
  stages: many(orderStages),
  warnings: many(warnings),
  photos: many(photos),
  milestoneHistory: many(milestoneDateHistory),
}));

export const orderStagesRelations = relations(orderStages, ({ one, many }) => ({
  order: one(orders, { fields: [orderStages.orderId], references: [orders.id] }),
  unit: one(units, { fields: [orderStages.unitId], references: [units.id] }),
  updates: many(dailyUpdates),
  warnings: many(warnings),
}));

export const dailyUpdatesRelations = relations(dailyUpdates, ({ one }) => ({
  orderStage: one(orderStages, { fields: [dailyUpdates.orderStageId], references: [orderStages.id] }),
  unit: one(units, { fields: [dailyUpdates.unitId], references: [units.id] }),
  submitter: one(users, { fields: [dailyUpdates.submittedBy], references: [users.id] }),
  photo: one(photos, { fields: [dailyUpdates.photoId], references: [photos.id] }),
}));

export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
}));

export const warningsRelations = relations(warnings, ({ one }) => ({
  order: one(orders, { fields: [warnings.orderId], references: [orders.id] }),
  orderStage: one(orderStages, { fields: [warnings.orderStageId], references: [orderStages.id] }),
  decider: one(users, { fields: [warnings.decidedBy], references: [users.id] }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  order: one(orders, { fields: [photos.orderId], references: [orders.id] }),
  uploader: one(users, { fields: [photos.uploadedBy], references: [users.id] }),
}));

export const milestoneDateHistoryRelations = relations(milestoneDateHistory, ({ one }) => ({
  order: one(orders, { fields: [milestoneDateHistory.orderId], references: [orders.id] }),
  orderStage: one(orderStages, { fields: [milestoneDateHistory.orderStageId], references: [orderStages.id] }),
  changer: one(users, { fields: [milestoneDateHistory.changedBy], references: [users.id] }),
}));

export const buyerLinksRelations = relations(buyerLinks, ({ one }) => ({
  buyer: one(buyers, { fields: [buyerLinks.buyerId], references: [buyers.id] }),
  creator: one(users, { fields: [buyerLinks.createdBy], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  buyer: one(buyers, { fields: [users.buyerId], references: [buyers.id] }),
  unit: one(units, { fields: [users.unitId], references: [units.id] }),
}));
