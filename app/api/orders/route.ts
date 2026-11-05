import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";
import { addDays, calculateRunRate, formatDate } from "@/lib/runrate";

const createOrderSchema = z.object({
  poNo: z.string().trim().min(1, "PO number is required"),
  buyerId: z.string().min(1, "Valid buyer is required"),
  style: z.string().trim().min(1, "Style is required"),
  exFactoryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  templateId: z.string().min(1, "TNA template is required"),
  lines: z
    .array(
      z.object({
        colour: z.string().trim().min(1, "Colour is required"),
        size: z.string().trim().min(1, "Size is required"),
        qty: z.number().int().positive("Quantity must be a positive integer"),
      })
    )
    .min(1, "At least one line is required"),
  stageUnitAssignments: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        fields[e.path.join(".")] = e.message;
      });
      return apiError("VALIDATION", "Invalid order payload", 400, fields);
    }

    const { poNo, buyerId, style, exFactoryDate, templateId, lines, stageUnitAssignments } = parsed.data;

    // Check buyer exists
    const buyer = store.getBuyerById(buyerId);
    if (!buyer) {
      return apiError("NOT_FOUND", "Selected buyer not found", 404);
    }

    // Check unique (buyer_id, po_no)
    const existing = store.getOrderByBuyerAndPo(buyerId, poNo);
    if (existing) {
      return apiError("CONFLICT", `PO '${poNo}' already exists for ${buyer.name}.`, 409);
    }

    // Template items
    const templateItems = store.getTemplateItems(templateId);
    if (templateItems.length === 0) {
      return apiError("NOT_FOUND", "TNA template not found or contains no stages", 404);
    }

    const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);
    const defaultUnitId = store.getUnits()[0].id;

    // Calculate back-dated milestones
    const stages = templateItems.map((item) => {
      const plannedStart = addDays(exFactoryDate, -item.offsetDaysBeforeExfactory);
      const plannedEnd = addDays(exFactoryDate, -(item.offsetDaysBeforeExfactory - item.plannedDurationDays));
      const assignedUnit =
        stageUnitAssignments?.[item.stage] ||
        (item.stage === "Printing" ? store.getUnits().find((u) => u.type === "subcontract")?.id || defaultUnitId : defaultUnitId);

      return {
        stage: item.stage,
        seq: item.seq,
        unitId: assignedUnit,
        targetQty: totalQty,
        plannedStart,
        plannedEnd,
      };
    });

    const newOrder = store.createOrder({
      poNo,
      buyerId,
      style,
      exFactoryDate,
      templateId,
      createdBy: authResult.auth.user.id,
      lines,
      stages,
    });

    store.logAudit(authResult.auth.user.id, "create_order", "orders", newOrder.id, { poNo, totalQty });

    return apiSuccess({ order: newOrder }, 201);
  } catch (err: any) {
    return apiError("INTERNAL_ERROR", err.message || "Failed to create order", 500);
  }
}

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const url = new URL(req.url);
  const filterBuyer = url.searchParams.get("buyer") || "";
  const filterUnit = url.searchParams.get("unit") || "";
  const filterWeek = url.searchParams.get("week") || "";
  const filterStatus = url.searchParams.get("status") || "";

  let orders = store.getOrders();
  const today = formatDate(new Date());

  // Compute status and run rate for each order
  const orderRows = orders.map((order) => {
    const buyer = store.getBuyerById(order.buyerId);
    const lines = store.getOrderLines(order.id);
    const stages = store.getOrderStages(order.id);
    const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);

    // Current stage is earliest stage with remaining quantity (ASSUMPTION A3)
    let currentStage = stages[0];
    let totalDoneInStage = 0;
    let completedStagesQty = 0;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const updates = store.getDailyUpdatesForStage(stage.id);
      const stageDone = updates.reduce((acc, u) => acc + u.qty, 0);

      if (stageDone < stage.targetQty || i === stages.length - 1) {
        currentStage = stage;
        totalDoneInStage = stageDone;
        break;
      } else {
        completedStagesQty += stageDone;
      }
    }

    const stageUpdates = store.getDailyUpdatesForStage(currentStage.id);
    const downstreamStages = stages
      .filter((s) => s.seq > currentStage.seq)
      .map((s) => ({ stage: s.stage, plannedDurationDays: 3 }));

    const runRate = calculateRunRate({
      orderId: order.id,
      currentStage: currentStage.stage,
      stageTargetQty: currentStage.targetQty,
      totalQtyDoneInStage: totalDoneInStage,
      exFactoryDate: order.exFactoryDate,
      today: "2026-11-05", // baseline today
      downstreamStages,
      recentUpdates: stageUpdates.map((u) => ({ reportedDate: u.reportedDate, qty: u.qty })),
    });

    const unit = store.getUnitById(currentStage.unitId);

    // Ship week helper: e.g. "W47 (Nov 16 - 22)"
    const exDate = new Date(order.exFactoryDate);
    const weekNum = Math.ceil(((exDate.getTime() - new Date(exDate.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
    const shipWeek = `W${weekNum}`;

    return {
      id: order.id,
      poNo: order.poNo,
      buyerId: order.buyerId,
      buyerName: buyer?.name || "Unknown",
      style: order.style,
      status: order.status,
      exFactoryDate: order.exFactoryDate,
      originalExFactoryDate: order.originalExFactoryDate,
      currentStage: currentStage.stage,
      unitId: currentStage.unitId,
      unitName: unit?.name || "Unit 1",
      shipWeek,
      totalQty,
      stageTargetQty: currentStage.targetQty,
      stageDone: totalDoneInStage,
      percentDone: Math.min(100, Math.round((totalDoneInStage / currentStage.targetQty) * 100)),
      runRate: {
        requiredRate: runRate.requiredRate,
        actualRate: runRate.actualRate,
        ratio: runRate.ratio,
        status: runRate.status,
        statusReason: runRate.statusReason,
        slipDays: runRate.slipDays,
        projectedFinish: runRate.projectedFinish,
        shortBy: Math.max(0, Math.round((runRate.requiredRate - runRate.actualRate) * 100) / 100),
      },
    };
  });

  // Apply filters
  let filtered = orderRows;
  if (filterBuyer) {
    filtered = filtered.filter((o) => o.buyerId === filterBuyer);
  }
  if (filterUnit) {
    filtered = filtered.filter((o) => o.unitId === filterUnit);
  }
  if (filterWeek) {
    filtered = filtered.filter((o) => o.shipWeek === filterWeek);
  }
  if (filterStatus) {
    filtered = filtered.filter((o) => o.runRate.status === filterStatus);
  }

  // Sort worst-first: red -> amber -> grey -> green (PRD §4.3)
  const statusRank: Record<string, number> = { red: 1, amber: 2, grey: 3, green: 4 };
  filtered.sort((a, b) => {
    const rankDiff = (statusRank[a.runRate.status] || 5) - (statusRank[b.runRate.status] || 5);
    if (rankDiff !== 0) return rankDiff;
    return a.exFactoryDate < b.exFactoryDate ? -1 : 1;
  });

  // Summary counts
  const summary = {
    red: orderRows.filter((o) => o.runRate.status === "red").length,
    amber: orderRows.filter((o) => o.runRate.status === "amber").length,
    green: orderRows.filter((o) => o.runRate.status === "green").length,
    grey: orderRows.filter((o) => o.runRate.status === "grey").length,
    total: orderRows.length,
  };

  return apiSuccess({ orders: filtered, summary });
}
