import { z } from "zod";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import * as repo from "@/lib/db/repo";
import { addDays, calculateRunRate, formatDate, STAGE_PLANNED_DURATION_DAYS } from "@/lib/runrate";

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
    const buyer = await repo.getBuyerById(buyerId);
    if (!buyer) {
      return apiError("NOT_FOUND", "Selected buyer not found", 404);
    }

    // Check unique (buyer_id, po_no)
    const existing = await repo.getOrderByBuyerAndPo(buyerId, poNo);
    if (existing) {
      return apiError("CONFLICT", `PO '${poNo}' already exists for ${buyer.name}.`, 409);
    }

    // Template items
    const templateItems = await repo.getTemplateItems(templateId);
    if (templateItems.length === 0) {
      return apiError("NOT_FOUND", "TNA template not found or contains no stages", 404);
    }

    const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);
    const units = await repo.getUnits();
    const defaultUnitId = units[0]?.id || "";

    // Calculate back-dated milestones
    const stages = templateItems.map((item) => {
      const plannedStart = addDays(exFactoryDate, -item.offsetDaysBeforeExfactory);
      const plannedEnd = addDays(exFactoryDate, -(item.offsetDaysBeforeExfactory - item.plannedDurationDays));
      const assignedUnit =
        stageUnitAssignments?.[item.stage] ||
        (item.stage === "Printing" ? units.find((u) => u.type === "subcontract")?.id || defaultUnitId : defaultUnitId);

      return {
        stage: item.stage,
        seq: item.seq,
        unitId: assignedUnit,
        targetQty: totalQty,
        plannedStart,
        plannedEnd,
      };
    });

    const newOrder = await repo.createOrder({
      poNo,
      buyerId,
      style,
      exFactoryDate,
      templateId,
      createdBy: authResult.auth.user.id,
      lines,
      stages,
    });

    await repo.logAudit(authResult.auth.user.id, "create_order", "orders", newOrder.id, { poNo, totalQty });

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

  // 1. Fetch orders, buyers, and units concurrently (eliminates N+1 buyer & unit queries)
  const [orders, buyers, units] = await Promise.all([
    repo.getOrders(),
    repo.getBuyers(),
    repo.getUnits(),
  ]);

  if (orders.length === 0) {
    return apiSuccess({
      orders: [],
      summary: { red: 0, amber: 0, green: 0, grey: 0, total: 0 },
    });
  }

  const buyerMap = new Map(buyers.map((b) => [b.id, b]));
  const unitMap = new Map(units.map((u) => [u.id, u]));
  const orderIds = orders.map((o) => o.id);

  // 2. Batch fetch lines and stages for all orders concurrently (eliminates 2 * N queries)
  const [linesMap, stagesMap] = await Promise.all([
    repo.getOrderLinesByOrderIds(orderIds),
    repo.getOrderStagesByOrderIds(orderIds),
  ]);

  // 3. Collect all stage IDs and batch fetch daily updates in 1 single query (eliminates 50+ N+1 stage queries)
  const allStageIds: string[] = [];
  stagesMap.forEach((stages) => {
    for (const s of stages) {
      allStageIds.push(s.id);
    }
  });

  const updatesByStageMap = await repo.getDailyUpdatesByStageIds(allStageIds);

  // 4. In-memory computation of status and run rate for each order (0 database queries inside loop)
  const orderRows = orders.map((order) => {
    const buyer = buyerMap.get(order.buyerId);
    const lines = linesMap.get(order.id) || [];
    const stages = stagesMap.get(order.id) || [];
    const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);

    // Current stage is earliest stage with remaining quantity (ASSUMPTION A3)
    let currentStage = stages[0];
    let totalDoneInStage = 0;
    let completedStagesQty = 0;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const updates = updatesByStageMap.get(stage.id) || [];
      const stageDone = updates.reduce((acc, u) => acc + u.qty, 0);

      if (stageDone < stage.targetQty || i === stages.length - 1) {
        currentStage = stage;
        totalDoneInStage = stageDone;
        break;
      } else {
        completedStagesQty += stageDone;
      }
    }

    const stageUpdates = currentStage ? (updatesByStageMap.get(currentStage.id) || []) : [];
    const downstreamStages = stages
      .filter((s) => s.seq > (currentStage?.seq || 0))
      .map((s) => ({ stage: s.stage, plannedDurationDays: STAGE_PLANNED_DURATION_DAYS[s.stage] ?? 2 }));

    const runRate = calculateRunRate({
      orderId: order.id,
      currentStage: currentStage?.stage || "Cutting",
      stageTargetQty: currentStage?.targetQty || totalQty,
      totalQtyDoneInStage: totalDoneInStage,
      exFactoryDate: order.exFactoryDate,
      today: "2026-11-05", // baseline today
      downstreamStages,
      recentUpdates: stageUpdates.map((u) => ({ reportedDate: u.reportedDate, qty: u.qty })),
    });

    const unit = currentStage ? unitMap.get(currentStage.unitId) : undefined;

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
      currentStage: currentStage?.stage || "Cutting",
      unitId: currentStage?.unitId || "",
      unitName: unit?.name || "Unit 1",
      shipWeek,
      totalQty,
      stageTargetQty: currentStage?.targetQty || totalQty,
      stageDone: totalDoneInStage,
      percentDone: Math.min(100, Math.round((totalDoneInStage / (currentStage?.targetQty || 1)) * 100)),
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
