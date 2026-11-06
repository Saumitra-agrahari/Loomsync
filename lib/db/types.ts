export type UserRole = "merchandiser" | "supervisor" | "buyer";
export type UserLocale = "en" | "ta";
export type UnitType = "own" | "subcontract";
export type OrderStatus = "open" | "shipped" | "cancelled";
export type CategorySource = "ai" | "fallback" | "human";
export type WarningStatus = "draft" | "confirmed" | "dismissed";

export type Buyer = {
  id: string;
  name: string;
  country: string;
  createdAt: string;
};

export type Unit = {
  id: string;
  name: string;
  type: UnitType;
  stagesSupported: string[];
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  buyerId?: string | null;
  unitId?: string | null;
  locale: UserLocale;
  active: boolean;
  createdAt: string;
};

export type BuyerLink = {
  id: string;
  buyerId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdBy: string;
  createdAt: string;
};

export type TnaTemplate = {
  id: string;
  name: string;
  createdAt: string;
};

export type TnaTemplateItem = {
  id: string;
  templateId: string;
  stage: string;
  seq: number;
  offsetDaysBeforeExfactory: number;
  plannedDurationDays: number;
};

export type Order = {
  id: string;
  poNo: string;
  buyerId: string;
  style: string;
  status: OrderStatus;
  exFactoryDate: string; // YYYY-MM-DD
  originalExFactoryDate: string; // YYYY-MM-DD
  templateId?: string | null;
  createdBy: string;
  createdAt: string;
};

export type OrderLine = {
  id: string;
  orderId: string;
  colour: string;
  size: string;
  qty: number;
};

export type OrderStage = {
  id: string;
  orderId: string;
  stage: string;
  seq: number;
  unitId: string;
  targetQty: number;
  plannedStart: string; // YYYY-MM-DD
  plannedEnd: string; // YYYY-MM-DD
  currentEnd: string; // YYYY-MM-DD
  actualEnd?: string | null;
};

export type MilestoneDateHistory = {
  id: string;
  orderId: string;
  orderStageId?: string | null;
  field: string;
  oldDate: string;
  newDate: string;
  reason: string;
  changedBy: string;
  changedAt: string;
};

export type Photo = {
  id: string;
  orderId: string;
  storageKey: string;
  imageData?: Buffer | null;
  mimeType?: string;
  sizeBytes?: number | null;
  uploadedBy: string;
  takenAt: string;
  visibleToBuyer: boolean;
};

export type DailyUpdate = {
  id: string;
  clientUuid: string;
  orderStageId: string;
  unitId: string;
  reportedDate: string; // YYYY-MM-DD
  qty: number;
  noteOriginal?: string | null;
  noteLang?: string | null;
  noteEn?: string | null;
  reasonCategory?: string | null;
  aiConfidence?: number | null;
  categorySource?: CategorySource | null;
  categoryChangedBy?: string | null;
  photoId?: string | null;
  submittedBy: string;
  clientTs: string;
  receivedAt: string;
  isCorrection: boolean;
};

export type Warning = {
  id: string;
  orderId: string;
  orderStageId: string;
  status: WarningStatus;
  requiredRate: number;
  actualRate: number;
  remaining: number;
  daysAvailable: number;
  slipDays: number;
  mathSnapshot: Record<string, any>;
  createdAt: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  dismissReason?: string | null;
};

export type Notification = {
  id: string;
  buyerId: string;
  warningId?: string | null;
  channel: string;
  payload: Record<string, any>;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, any> | null;
  at: string;
};
