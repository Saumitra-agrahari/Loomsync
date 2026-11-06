import Dexie, { type Table } from "dexie";

export type OutboxItem = {
  id?: number;
  clientUuid: string;
  orderStageId: string;
  orderId: string;
  poNo: string;
  style: string;
  stage: string;
  unitId: string;
  reportedDate: string; // YYYY-MM-DD
  qty: number;
  note?: string;
  photoKey?: string;
  photoBase64?: string;
  clientTs: string;
  status: "queued" | "sending" | "sent" | "failed";
  error?: string;
  createdAt: number;
};

class SupervisorOfflineDB extends Dexie {
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super("TiruppurSupervisorDB");
    this.version(1).stores({
      outbox: "++id, clientUuid, orderStageId, reportedDate, status, createdAt",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new SupervisorOfflineDB() : null;

/**
 * Queue an update locally in IndexedDB
 */
export async function queueUpdate(item: Omit<OutboxItem, "id" | "status" | "createdAt">): Promise<OutboxItem | null> {
  if (!offlineDb) return null;
  const outboxItem: OutboxItem = {
    ...item,
    status: "queued",
    createdAt: Date.now(),
  };
  const id = await offlineDb.outbox.add(outboxItem);
  return { ...outboxItem, id };
}

/**
 * Get all queued updates
 */
export async function getQueuedUpdates(): Promise<OutboxItem[]> {
  if (!offlineDb) return [];
  return offlineDb.outbox.where("status").equals("queued").toArray();
}

/**
 * Mark item as sent
 */
export async function markUpdateSent(clientUuid: string): Promise<void> {
  if (!offlineDb) return;
  const item = await offlineDb.outbox.where("clientUuid").equals(clientUuid).first();
  if (item && item.id) {
    await offlineDb.outbox.update(item.id, { status: "sent" });
  }
}

/**
 * Sync outbox queue with server
 */
export async function syncOutbox(): Promise<{ synced: number; failed: number }> {
  if (!offlineDb) return { synced: 0, failed: 0 };
  const queued = await getQueuedUpdates();
  if (queued.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  try {
    const payload = {
      updates: queued.map((item) => ({
        client_uuid: item.clientUuid,
        order_stage_id: item.orderStageId,
        reported_date: item.reportedDate,
        qty: item.qty,
        note: item.note || undefined,
        photo_key: item.photoKey || undefined,
        photo_base64: item.photoBase64 || undefined,
        client_ts: item.clientTs,
      })),
    };

    const res = await fetch("/api/updates/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      for (const result of data.results) {
        if (result.status === "created" || result.status === "duplicate") {
          await markUpdateSent(result.client_uuid);
          synced++;
        } else {
          failed++;
        }
      }
    } else {
      failed += queued.length;
    }
  } catch (err) {
    failed += queued.length;
  }

  return { synced, failed };
}
