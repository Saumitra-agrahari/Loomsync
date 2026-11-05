import ExcelJS from "exceljs";
import { authenticate, apiError } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function GET(req: Request) {
  const authResult = authenticate(req, ["merchandiser", "buyer"]);
  if ("response" in authResult) return authResult.response;

  const url = new URL(req.url);
  const requestedBuyerId = url.searchParams.get("buyer");
  const { user } = authResult.auth;

  // Strict Buyer Scoping
  let targetBuyerId: string;
  if (user.role === "buyer") {
    if (!user.buyerId) {
      return apiError("FORBIDDEN", "No buyer associated with this session", 403);
    }
    // If a buyer requests another buyer's export, block with 403/404!
    if (requestedBuyerId && requestedBuyerId !== user.buyerId) {
      return apiError("FORBIDDEN", "Cannot export data for other buyers", 403);
    }
    targetBuyerId = user.buyerId;
  } else {
    // Merchandiser can pick any buyer or defaults to first
    targetBuyerId = requestedBuyerId || store.getBuyers()[0].id;
  }

  const buyer = store.getBuyerById(targetBuyerId);
  if (!buyer) {
    return apiError("NOT_FOUND", "Buyer not found", 404);
  }

  const orders = store.getOrders().filter((o) => o.buyerId === targetBuyerId);

  // Generate Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tiruppur Order Tracker";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Weekly Status — ${buyer.name.substring(0, 20)}`);

  worksheet.columns = [
    { header: "PO Number", key: "poNo", width: 18 },
    { header: "Style Name", key: "style", width: 30 },
    { header: "Ex-Factory Date", key: "exFactory", width: 16 },
    { header: "Total Qty (pcs)", key: "totalQty", width: 16 },
    { header: "Current Stage", key: "stage", width: 16 },
    { header: "Stage Done", key: "stageDone", width: 14 },
    { header: "Progress (%)", key: "progress", width: 14 },
    { header: "Delay Notice", key: "delay", width: 20 },
  ];

  // Header style
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2B3A67" }, // Accent deep indigo
  };

  for (const order of orders) {
    const lines = store.getOrderLines(order.id);
    const stages = store.getOrderStages(order.id);
    const totalQty = lines.reduce((acc, l) => acc + l.qty, 0);

    let activeStage = stages[0];
    let totalDone = 0;
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const updates = store.getDailyUpdatesForStage(s.id);
      const stageDone = updates.reduce((acc, u) => acc + u.qty, 0);
      if (stageDone < s.targetQty || i === stages.length - 1) {
        activeStage = s;
        totalDone = stageDone;
        break;
      }
    }

    const confirmedWarnings = store.getWarningsForOrder(order.id, true);
    const delayNotice =
      confirmedWarnings.length > 0 ? `Delayed by ${confirmedWarnings[0].slipDays} days` : "On Schedule";

    worksheet.addRow({
      poNo: order.poNo,
      style: order.style,
      exFactory: order.exFactoryDate,
      totalQty,
      stage: activeStage.stage,
      stageDone: totalDone,
      progress: `${Math.min(100, Math.round((totalDone / activeStage.targetQty) * 100))}%`,
      delay: delayNotice,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const safeBuyerName = buyer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Weekly_Status_${safeBuyerName}_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
