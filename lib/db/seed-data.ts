// Seed data generator: strictly adheres to Database.md and PRD.md
// ASSUMPTION A7: Invented orders, rates, and historical updates to produce a realistic green/amber/red mix.
// ASSUMPTION A1: Standard 5-stage knitwear TNA template: Cutting -> Printing -> Stitching -> Finishing -> Packing.
// ASSUMPTION A2: 6-day working week (Sunday off).

import bcrypt from "bcryptjs";
import crypto from "crypto";
import zlib from "zlib";
import { addDays, formatDate, isWorkingDay } from "../runrate";
import type {
  Buyer,
  Unit,
  User,
  TnaTemplate,
  TnaTemplateItem,
  Order,
  OrderLine,
  OrderStage,
  MilestoneDateHistory,
  DailyUpdate,
  Photo,
  Warning,
  BuyerLink,
} from "./types";

export function toUuid(str: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  const h = crypto.createHash("md5").update(str).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Generate valid synthetic PNG images (no real people or faces) for progress photos
export function createSyntheticPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const body = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4);
    let c = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ body[i]) & 0xff];
    }
    crc.writeInt32BE((c ^ 0xffffffff) | 0, 0);
    return Buffer.concat([len, body, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk("IHDR", ihdr);

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 3);
    raw[offset] = 0;
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      const stripe = ((x >> 3) + (y >> 3)) % 2 === 0;
      raw[px] = stripe ? r : Math.max(0, r - 25);
      raw[px + 1] = stripe ? g : Math.max(0, g - 25);
      raw[px + 2] = stripe ? b : Math.max(0, b - 25);
    }
  }
  const idatData = zlib.deflateSync(raw);
  const idatChunk = makeChunk("IDAT", idatData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const syntheticPngs = [
  createSyntheticPng(80, 60, 25, 35, 95),   // 1. Navy single jersey knit fabric swatch
  createSyntheticPng(80, 60, 230, 230, 235), // 2. White pique knit cotton panel
  createSyntheticPng(80, 60, 240, 210, 45),  // 3. Yellow kids print panel inspection
  createSyntheticPng(80, 60, 75, 115, 70),   // 4. Sage rib trim quality assurance
];

export function generateSeedData(baseToday: string = "2026-11-05") {
  const passwordHash = bcrypt.hashSync("Demo@12345", 10);
  const nowIso = new Date().toISOString();

  // Buyers
  const buyers: Buyer[] = [
    {
      id: "b1111111-0000-0000-0000-000000000001",
      name: "Company B (UK)",
      country: "United Kingdom",
      createdAt: nowIso,
    },
    {
      id: "c2222222-0000-0000-0000-000000000002",
      name: "Company C (Germany)",
      country: "Germany",
      createdAt: nowIso,
    },
  ];

  // Units
  const units: Unit[] = [
    {
      id: "u1111111-0000-0000-0000-000000000001",
      name: "Unit 1 — Main Factory (Kangeyam Rd)",
      type: "own",
      stagesSupported: ["Cutting", "Stitching", "Finishing", "Packing"],
      createdAt: nowIso,
    },
    {
      id: "u2222222-0000-0000-0000-000000000002",
      name: "Unit 2 — Weaving & Stitching (Dharapuram Rd)",
      type: "own",
      stagesSupported: ["Cutting", "Stitching", "Finishing", "Packing"],
      createdAt: nowIso,
    },
    {
      id: "u3333333-0000-0000-0000-000000000003",
      name: "Unit 3 — Export Garments (Avinashi Rd)",
      type: "own",
      stagesSupported: ["Cutting", "Stitching", "Finishing", "Packing"],
      createdAt: nowIso,
    },
    {
      id: "u4444444-0000-0000-0000-000000000004",
      name: "Tiruppur Screen & Rotary Printers",
      type: "subcontract",
      stagesSupported: ["Printing"],
      createdAt: nowIso,
    },
    {
      id: "u5555555-0000-0000-0000-000000000005",
      name: "Cauvery Bio-Wash Works",
      type: "subcontract",
      stagesSupported: ["Washing"],
      createdAt: nowIso,
    },
  ];

  // Users (from Deployment.md)
  const users: User[] = [
    {
      id: "usr-merch-01",
      name: "Murugan Selvam",
      email: "merch@demo.example",
      passwordHash,
      role: "merchandiser",
      locale: "en",
      active: true,
      createdAt: nowIso,
    },
    {
      id: "usr-sup-01",
      name: "Karthik Raja",
      email: "sup1@demo.example",
      passwordHash,
      role: "supervisor",
      unitId: units[0].id,
      locale: "ta",
      active: true,
      createdAt: nowIso,
    },
    {
      id: "usr-sup-02",
      name: "Anand Kumar",
      email: "sup2@demo.example",
      passwordHash,
      role: "supervisor",
      unitId: units[1].id,
      locale: "ta",
      active: true,
      createdAt: nowIso,
    },
    {
      id: "usr-sup-03",
      name: "Palaniswamy M",
      email: "sup3@demo.example",
      passwordHash,
      role: "supervisor",
      unitId: units[2].id,
      locale: "ta",
      active: true,
      createdAt: nowIso,
    },
    {
      id: "usr-buyer-b",
      name: "Oliver Smith (Company B UK)",
      email: "buyerb@demo.example",
      passwordHash,
      role: "buyer",
      buyerId: buyers[0].id,
      locale: "en",
      active: true,
      createdAt: nowIso,
    },
    {
      id: "usr-buyer-c",
      name: "Hans Becker (Company C Germany)",
      email: "buyerc@demo.example",
      passwordHash,
      role: "buyer",
      buyerId: buyers[1].id,
      locale: "en",
      active: true,
      createdAt: nowIso,
    },
  ];

  // Buyer token link for Company B
  // SHA-256 for "demo-buyer-b-token-1234567890"
  // crypto.createHash('sha256').update('demo-buyer-b-token-1234567890').digest('hex')
  const buyerLinks: BuyerLink[] = [
    {
      id: "blink-b1",
      buyerId: buyers[0].id,
      tokenHash: "61c97eb8b5cd04b9980b3270e4ad316232a11d40c58539b09ced64921af40c2b",
      expiresAt: "2027-12-31T23:59:59Z",
      createdBy: users[0].id,
      createdAt: nowIso,
    },
  ];

  // TNA Templates
  const tnaTemplates: TnaTemplate[] = [
    {
      id: "tmpl-tee-polo-01",
      name: "Knitwear Standard (Cutting → Printing → Stitching → Finishing → Packing)",
      createdAt: nowIso,
    },
  ];

  const tnaTemplateItems: TnaTemplateItem[] = [
    {
      id: "ti-1",
      templateId: tnaTemplates[0].id,
      stage: "Cutting",
      seq: 1,
      offsetDaysBeforeExfactory: 22,
      plannedDurationDays: 3,
    },
    {
      id: "ti-2",
      templateId: tnaTemplates[0].id,
      stage: "Printing",
      seq: 2,
      offsetDaysBeforeExfactory: 19,
      plannedDurationDays: 4,
    },
    {
      id: "ti-3",
      templateId: tnaTemplates[0].id,
      stage: "Stitching",
      seq: 3,
      offsetDaysBeforeExfactory: 15,
      plannedDurationDays: 8,
    },
    {
      id: "ti-4",
      templateId: tnaTemplates[0].id,
      stage: "Finishing",
      seq: 4,
      offsetDaysBeforeExfactory: 7,
      plannedDurationDays: 4,
    },
    {
      id: "ti-5",
      templateId: tnaTemplates[0].id,
      stage: "Packing",
      seq: 5,
      offsetDaysBeforeExfactory: 3,
      plannedDurationDays: 3,
    },
  ];

  // Orders definitions
  // 3 sample orders + 8 invented orders
  type OrderSeedDef = {
    id: string;
    poNo: string;
    buyerId: string;
    style: string;
    totalQty: number;
    exFactoryDate: string;
    originalExFactoryDate: string;
    currentStage: string;
    stageDone: number;
    last3Rate?: number; // ASSUMPTION A7: average output rate per day over the last 3 working days
    isGrey?: boolean;
    lines: Array<{ colour: string; size: string; qty: number }>;
    unitId: string;
    history?: Array<{ field: string; oldDate: string; newDate: string; reason: string; date: string }>;
    notes?: Array<{ date: string; original: string; en: string; category: string; source: "ai" | "fallback" | "human" }>;
  };

  const seedDefs: OrderSeedDef[] = [
    {
      // 1. Core Sample 1: Amber (~480/day vs ~520 needed) // ASSUMPTION A7
      id: "ord-b-88213",
      poNo: "B-PO-88213",
      buyerId: buyers[0].id,
      style: "Men's crew neck tee, navy",
      totalQty: 12000,
      exFactoryDate: addDays(baseToday, 15), // 2026-11-20
      originalExFactoryDate: addDays(baseToday, 15),
      currentStage: "Stitching",
      stageDone: 6800,
      last3Rate: 480, // ASSUMPTION A7: 480/day vs 520 needed -> AMBER (ratio ~0.92)
      unitId: units[0].id,
      lines: [
        { colour: "Navy", size: "S", qty: 3000 },
        { colour: "Navy", size: "M", qty: 4000 },
        { colour: "Navy", size: "L", qty: 3500 },
        { colour: "Navy", size: "XL", qty: 1500 },
      ],
      notes: [
        {
          date: addDays(baseToday, -2),
          original: "தையல் இயந்திரம் பழுதாகிவிட்டது",
          en: "Sewing machine breakdown",
          category: "machine_breakdown",
          source: "ai",
        },
      ],
    },
    {
      // 2. Core Sample 2: Red (~400/day vs ~560 needed) // ASSUMPTION A7
      id: "ord-b-88240",
      poNo: "B-PO-88240",
      buyerId: buyers[0].id,
      style: "Men's polo, white",
      totalQty: 8000,
      exFactoryDate: addDays(baseToday, 7), // 2026-11-12
      originalExFactoryDate: addDays(baseToday, 5), // originally 2026-11-10
      currentStage: "Finishing",
      stageDone: 5200,
      last3Rate: 400, // ASSUMPTION A7: 400/day vs 560 needed -> RED (ratio ~0.71)
      unitId: units[1].id,
      lines: [
        { colour: "White", size: "S", qty: 2000 },
        { colour: "White", size: "M", qty: 3000 },
        { colour: "White", size: "L", qty: 2000 },
        { colour: "White", size: "XL", qty: 1000 },
      ],
      history: [
        {
          field: "ex_factory_date",
          oldDate: addDays(baseToday, 5),
          newDate: addDays(baseToday, 7),
          reason: "Fabric shade variation rework required 2 extra days before stitching",
          date: addDays(baseToday, -8),
        },
      ],
      notes: [
        {
          date: addDays(baseToday, -1),
          original: "இன்று ஆட்கள் குறைவு",
          en: "Manpower shortage today",
          category: "manpower_shortage",
          source: "ai",
        },
      ],
    },
    {
      // 3. Core Sample 3: Green (~600/day vs ~575 needed) // ASSUMPTION A7
      id: "ord-c-0488",
      poNo: "C-PO-0488",
      buyerId: buyers[1].id,
      style: "Kids printed tee, yellow",
      totalQty: 10000,
      exFactoryDate: addDays(baseToday, 23), // 2026-11-28
      originalExFactoryDate: addDays(baseToday, 23),
      currentStage: "Printing",
      stageDone: 3100,
      last3Rate: 600, // ASSUMPTION A7: 600/day vs 575 needed -> GREEN (ratio ~1.04)
      unitId: units[3].id,
      lines: [
        { colour: "Yellow", size: "4-5Y", qty: 2500 },
        { colour: "Yellow", size: "6-7Y", qty: 3500 },
        { colour: "Yellow", size: "8-9Y", qty: 4000 },
      ],
    },
    // ASSUMPTION A7: 8 Invented Orders across both buyers (balanced board: exactly 1 RED, 2 AMBER, 7 GREEN, 1 GREY)
    {
      id: "ord-b-88255",
      poNo: "B-PO-88255",
      buyerId: buyers[0].id,
      style: "Women's V-neck tee, coral",
      totalQty: 6000,
      exFactoryDate: addDays(baseToday, 20),
      originalExFactoryDate: addDays(baseToday, 20),
      currentStage: "Cutting",
      stageDone: 4000,
      last3Rate: 400, // GREEN
      unitId: units[0].id,
      lines: [
        { colour: "Coral", size: "S", qty: 2000 },
        { colour: "Coral", size: "M", qty: 2500 },
        { colour: "Coral", size: "L", qty: 1500 },
      ],
    },
    {
      id: "ord-b-88260",
      poNo: "B-PO-88260",
      buyerId: buyers[0].id,
      style: "Men's zip hoodie, heather grey",
      totalQty: 5000,
      exFactoryDate: addDays(baseToday, 14),
      originalExFactoryDate: addDays(baseToday, 14),
      currentStage: "Stitching",
      stageDone: 2100,
      last3Rate: 310, // AMBER
      unitId: units[1].id,
      lines: [
        { colour: "Heather Grey", size: "M", qty: 2500 },
        { colour: "Heather Grey", size: "L", qty: 2500 },
      ],
      notes: [
        {
          date: addDays(baseToday, -3),
          original: "மின்சாரம் இல்லை",
          en: "Power cut in the area",
          category: "power_cut",
          source: "ai",
        },
      ],
    },
    {
      id: "ord-b-88272",
      poNo: "B-PO-88272",
      buyerId: buyers[0].id,
      style: "Girls ruffle top, pink",
      totalQty: 9000,
      exFactoryDate: addDays(baseToday, 27),
      originalExFactoryDate: addDays(baseToday, 27),
      currentStage: "Cutting",
      stageDone: 5000,
      last3Rate: 500, // GREEN
      unitId: units[2].id,
      lines: [
        { colour: "Pink", size: "6Y", qty: 4500 },
        { colour: "Pink", size: "8Y", qty: 4500 },
      ],
    },
    {
      id: "ord-b-88280",
      poNo: "B-PO-88280",
      buyerId: buyers[0].id,
      style: "Boys sports jersey, royal blue",
      totalQty: 7500,
      exFactoryDate: addDays(baseToday, 25),
      originalExFactoryDate: addDays(baseToday, 25),
      currentStage: "Printing",
      stageDone: 2500,
      last3Rate: 450, // GREEN
      unitId: units[0].id,
      lines: [
        { colour: "Royal Blue", size: "S", qty: 3500 },
        { colour: "Royal Blue", size: "M", qty: 4000 },
      ],
    },
    {
      id: "ord-c-0492",
      poNo: "C-PO-0492",
      buyerId: buyers[1].id,
      style: "Organic cotton basic tee, olive",
      totalQty: 15000,
      exFactoryDate: addDays(baseToday, 35),
      originalExFactoryDate: addDays(baseToday, 35),
      currentStage: "Cutting",
      stageDone: 8000,
      last3Rate: 700, // GREEN
      unitId: units[3].id,
      lines: [
        { colour: "Olive", size: "M", qty: 7500 },
        { colour: "Olive", size: "L", qty: 7500 },
      ],
    },
    {
      id: "ord-c-0501",
      poNo: "C-PO-0501",
      buyerId: buyers[1].id,
      style: "Heavyweight loopback sweatshirt, black",
      totalQty: 8500,
      exFactoryDate: addDays(baseToday, 22),
      originalExFactoryDate: addDays(baseToday, 22),
      currentStage: "Stitching",
      stageDone: 4500,
      last3Rate: 550, // GREEN
      unitId: units[2].id,
      lines: [
        { colour: "Black", size: "M", qty: 3500 },
        { colour: "Black", size: "L", qty: 3000 },
      ],
      history: [
        {
          field: "current_end",
          oldDate: addDays(baseToday, 3),
          newDate: addDays(baseToday, 6),
          reason: "Steam press boiler maintenance shutdown for 48 hours",
          date: addDays(baseToday, -4),
        },
      ],
      notes: [
        {
          date: addDays(baseToday, -2),
          original: "துணி இன்னும் வரவில்லை",
          en: "Fabric not received yet",
          category: "material_shortage",
          source: "ai",
        },
      ],
    },
    {
      id: "ord-c-0515",
      poNo: "C-PO-0515",
      buyerId: buyers[1].id,
      style: "Baby rib romper 3-pack, multi",
      totalQty: 11000,
      exFactoryDate: addDays(baseToday, 25),
      originalExFactoryDate: addDays(baseToday, 25),
      currentStage: "Stitching",
      stageDone: 5500,
      last3Rate: 600, // GREEN
      unitId: units[1].id,
      lines: [
        { colour: "Multi", size: "0-3M", qty: 5000 },
        { colour: "Multi", size: "3-6M", qty: 6000 },
      ],
    },
    {
      id: "ord-c-0520",
      poNo: "C-PO-0520",
      buyerId: buyers[1].id,
      style: "Striped nautical polo, navy/white",
      totalQty: 4500,
      exFactoryDate: addDays(baseToday, 4),
      originalExFactoryDate: addDays(baseToday, 4),
      currentStage: "Packing",
      stageDone: 4000,
      isGrey: true, // GREY: edge case test with <2 updates in last 2 days
      unitId: units[0].id,
      lines: [
        { colour: "Navy/White", size: "M", qty: 2500 },
        { colour: "Navy/White", size: "L", qty: 2000 },
      ],
    },
  ];

  const orders: Order[] = [];
  const orderLines: OrderLine[] = [];
  const orderStages: OrderStage[] = [];
  const milestoneDateHistory: MilestoneDateHistory[] = [];
  const dailyUpdates: DailyUpdate[] = [];
  const photos: Photo[] = [];
  const warnings: Warning[] = [];

  for (const def of seedDefs) {
    orders.push({
      id: def.id,
      poNo: def.poNo,
      buyerId: def.buyerId,
      style: def.style,
      status: "open",
      exFactoryDate: def.exFactoryDate,
      originalExFactoryDate: def.originalExFactoryDate,
      templateId: tnaTemplates[0].id,
      createdBy: users[0].id,
      createdAt: nowIso,
    });

    // Order lines
    let lineIdx = 1;
    for (const l of def.lines) {
      orderLines.push({
        id: `line-${def.id}-${lineIdx++}`,
        orderId: def.id,
        colour: l.colour,
        size: l.size,
        qty: l.qty,
      });
    }

    // Order stages (TNA stages)
    const stageNames = ["Cutting", "Printing", "Stitching", "Finishing", "Packing"];
    const currentStageIdx = stageNames.indexOf(def.currentStage);

    let stageSeq = 1;
    for (const item of tnaTemplateItems) {
      const stageId = `stage-${def.id}-${item.seq}`;
      const plannedEnd = addDays(def.exFactoryDate, -(item.offsetDaysBeforeExfactory - item.plannedDurationDays));
      const plannedStart = addDays(def.exFactoryDate, -item.offsetDaysBeforeExfactory);

      // Unit assignment: printing goes to printing sub, others to unitId
      const assignedUnit = item.stage === "Printing" ? units[3].id : def.unitId;

      let actualEnd: string | null = null;
      if (item.seq - 1 < currentStageIdx) {
        // Prior stages completed (consistent completed quantities matching def.totalQty)
        actualEnd = plannedEnd;
        const priorDays = [
          addDays(baseToday, -18 - (currentStageIdx - item.seq) * 4),
          addDays(baseToday, -17 - (currentStageIdx - item.seq) * 4),
          addDays(baseToday, -16 - (currentStageIdx - item.seq) * 4),
        ];
        const part = Math.floor(def.totalQty / 3);
        const remainder = def.totalQty - part * 2;
        const qtys = [part, part, remainder];

        priorDays.forEach((dateStr, pIdx) => {
          const clientUuid = `uuid-${def.id}-${stageId}-prior-${pIdx}`;
          const clientTs = `${dateStr}T17:00:00.000Z`;
          dailyUpdates.push({
            id: `upd-${def.id}-prior-${item.seq}-${pIdx}`,
            clientUuid,
            orderStageId: stageId,
            unitId: assignedUnit,
            reportedDate: dateStr,
            qty: qtys[pIdx],
            noteOriginal: null,
            noteLang: null,
            noteEn: null,
            reasonCategory: null,
            aiConfidence: null,
            categorySource: null,
            photoId: null,
            submittedBy: users[1].id,
            clientTs,
            receivedAt: clientTs,
            isCorrection: false,
          });
        });
      }

      const orderStageObj: OrderStage = {
        id: stageId,
        orderId: def.id,
        stage: item.stage,
        seq: stageSeq++,
        unitId: assignedUnit,
        targetQty: def.totalQty,
        plannedStart,
        plannedEnd,
        currentEnd: plannedEnd,
        actualEnd,
      };
      orderStages.push(orderStageObj);

      // Populate 14 working days of update history for the active stage
      if (item.seq - 1 === currentStageIdx) {
        if (def.isGrey) {
          // Grey edge case: only 1 update reported 3 working days ago, none in last 2 days
          const greyDate = addDays(baseToday, -3);
          const clientUuid = `uuid-${def.id}-${stageId}-${greyDate}`;
          const clientTs = `${greyDate}T17:30:00.000Z`;
          dailyUpdates.push({
            id: `upd-${def.id}-0`,
            clientUuid,
            orderStageId: stageId,
            unitId: assignedUnit,
            reportedDate: greyDate,
            qty: def.stageDone,
            noteOriginal: "ஆட்கள் பற்றாக்குறை",
            noteLang: "ta",
            noteEn: "Worker shortage",
            reasonCategory: "manpower_shortage",
            aiConfidence: 0.9,
            categorySource: "ai",
            photoId: null,
            submittedBy: users[1].id,
            clientTs,
            receivedAt: clientTs,
            isCorrection: false,
          });
        } else {
          // Find exactly 14 working days leading up to baseToday
          const workingDaysIn14: string[] = [];
          for (let d = -22; d <= 0; d++) {
            const dateStr = addDays(baseToday, d);
            if (isWorkingDay(dateStr)) {
              workingDaysIn14.push(dateStr);
            }
          }
          const last14 = workingDaysIn14.slice(-14);
          const count = last14.length;

          // Target last 3 days rate (ASSUMPTION A7)
          const targetLast3Rate = def.last3Rate ?? Math.round(def.stageDone / count);
          const priorCount = count - 3;
          const priorTotal = def.stageDone - 3 * targetLast3Rate;
          const avgPrior = Math.floor(priorTotal / priorCount);
          let accumPrior = 0;

          last14.forEach((dateStr, idx) => {
            let dayQty = 0;
            if (idx >= priorCount) {
              // Last 3 working days: exact rate to produce required run-rate ratio
              dayQty = targetLast3Rate;
            } else if (idx === priorCount - 1) {
              dayQty = priorTotal - accumPrior;
            } else {
              dayQty = avgPrior;
              accumPrior += dayQty;
            }

            const clientUuid = `uuid-${def.id}-${stageId}-${dateStr}`;
            const clientTs = `${dateStr}T17:30:00.000Z`;

            // Check if note exists for this date
            const matchedNote = def.notes?.find((n) => n.date === dateStr);

            // Add photo for recent days with synthetic placeholder image
            let photoId: string | null = null;
            if (idx === count - 1 || idx === count - 3) {
              photoId = `photo-${def.id}-${idx}`;
              const pngBuf = syntheticPngs[photos.length % syntheticPngs.length];
              photos.push({
                id: photoId,
                orderId: def.id,
                storageKey: `photos/${def.poNo}/${dateStr}.png`,
                imageData: pngBuf,
                mimeType: "image/png",
                sizeBytes: pngBuf.length,
                uploadedBy: users[1].id,
                takenAt: clientTs,
                visibleToBuyer: true,
              });
            }

            dailyUpdates.push({
              id: `upd-${def.id}-${idx}`,
              clientUuid,
              orderStageId: stageId,
              unitId: assignedUnit,
              reportedDate: dateStr,
              qty: dayQty,
              noteOriginal: matchedNote?.original || (idx === count - 1 ? "அனைத்து வேலைகளும் திட்டமிட்டபடி நடக்கின்றன" : null),
              noteLang: matchedNote ? "ta" : (idx === count - 1 ? "ta" : null),
              noteEn: matchedNote?.en || (idx === count - 1 ? "Production proceeding as planned" : null),
              reasonCategory: matchedNote?.category || null,
              aiConfidence: matchedNote ? 0.92 : (idx === count - 1 ? 0.88 : null),
              categorySource: matchedNote?.source || (idx === count - 1 ? "ai" : null),
              photoId,
              submittedBy: users[1].id,
              clientTs,
              receivedAt: clientTs,
              isCorrection: false,
            });
          });
        }
      }
    }

    // Add milestone date history if defined
    if (def.history) {
      for (const h of def.history) {
        milestoneDateHistory.push({
          id: `hist-${def.id}-${h.date}`,
          orderId: def.id,
          field: h.field,
          oldDate: h.oldDate,
          newDate: h.newDate,
          reason: h.reason,
          changedBy: users[0].id,
          changedAt: `${h.date}T10:00:00.000Z`,
        });
      }
    }
  }

  // Pre-seed 1 draft warning for B-PO-88240 (Red order)
  const redOrderStage = orderStages.find((s) => s.orderId === "ord-b-88240" && s.stage === "Finishing");
  if (redOrderStage) {
    warnings.push({
      id: "warn-b-88240-draft",
      orderId: "ord-b-88240",
      orderStageId: redOrderStage.id,
      status: "draft",
      requiredRate: 560,
      actualRate: 400,
      remaining: 2800,
      daysAvailable: 5,
      slipDays: 2,
      mathSnapshot: {
        stageTargetQty: 8000,
        totalQtyDoneInStage: 5200,
        remaining: 2800,
        downstreamDays: 1,
        workingDaysTotal: 6,
        daysAvailable: 5,
        requiredRate: 560,
        actualRate: 400,
        ratio: 0.71,
        projectedFinish: addDays(baseToday, 9),
        slipDays: 2,
        today: baseToday,
        exFactoryDate: addDays(baseToday, 7),
        calculatedAt: nowIso,
      },
      createdAt: nowIso,
    });
  }

  return {
    buyers,
    units,
    users,
    buyerLinks,
    tnaTemplates,
    tnaTemplateItems,
    orders,
    orderLines,
    orderStages,
    milestoneDateHistory,
    dailyUpdates,
    photos,
    warnings,
  };
}
