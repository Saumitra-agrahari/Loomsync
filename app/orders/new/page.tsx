"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { addDays } from "@/lib/runrate";
import { ErrorBanner } from "@/components/States";

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Form State
  const [poNo, setPoNo] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [style, setStyle] = useState("");
  const [exFactoryDate, setExFactoryDate] = useState("2026-12-15");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Step 2 Quantities: list of { colour, size, qty }
  const [lines, setLines] = useState<Array<{ colour: string; size: string; qty: number }>>([
    { colour: "Navy", size: "S", qty: 1000 },
    { colour: "Navy", size: "M", qty: 1500 },
    { colour: "Navy", size: "L", qty: 1500 },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/buyers").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/units").then((r) => r.json()),
    ]).then(([buyersData, templatesData, unitsData]) => {
      setBuyers(buyersData.buyers || []);
      if (buyersData.buyers?.length > 0) setBuyerId(buyersData.buyers[0].id);

      setTemplates(templatesData.templates || []);
      if (templatesData.templates?.length > 0) setSelectedTemplateId(templatesData.templates[0].id);

      setUnits(unitsData.units || []);
    });
  }, []);

  const totalQty = lines.reduce((acc, l) => acc + (Number(l.qty) || 0), 0);

  const addLine = () => {
    setLines([...lines, { colour: "Navy", size: "XL", qty: 500 }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  // Step 3 Milestones Preview calculation
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const templateItems = selectedTemplate?.items || [];
  const milestonesPreview = templateItems.map((item: any) => {
    const plannedStart = addDays(exFactoryDate, -item.offsetDaysBeforeExfactory);
    const plannedEnd = addDays(exFactoryDate, -(item.offsetDaysBeforeExfactory - item.plannedDurationDays));
    return {
      stage: item.stage,
      seq: item.seq,
      plannedStart,
      plannedEnd,
      duration: item.plannedDurationDays,
    };
  });

  const handleNextStep = () => {
    setError(null);
    setFieldErrors({});

    if (step === 1) {
      if (!poNo.trim()) {
        setError("PO Number is required");
        return;
      }
      if (!style.trim()) {
        setError("Style name is required");
        return;
      }
      if (!exFactoryDate) {
        setError("Ex-Factory Date is required");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (totalQty <= 0) {
        setError("Total quantity must be greater than zero");
        return;
      }
      for (const line of lines) {
        if (!line.colour.trim() || !line.size.trim() || line.qty <= 0) {
          setError("All colour and size quantities must be positive integers");
          return;
        }
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNo,
          buyerId,
          style,
          exFactoryDate,
          templateId: selectedTemplateId,
          lines: lines.map((l) => ({ colour: l.colour, size: l.size, qty: Number(l.qty) })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to create order");
        if (data.error?.fields) setFieldErrors(data.error.fields);
        setSubmitting(false);
        return;
      }

      router.push(`/orders/${data.order.id}`);
    } catch {
      setError("Network error while creating order");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">New Order Setup</h1>
          <p className="text-xs sm:text-sm text-textSecondary">
            Set up PO, style, quantities, and generate back-calculated TNA milestones
          </p>
        </div>

        {/* Step indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-center text-xs sm:text-sm font-semibold">
          <div
            className={`py-2 border-b-2 ${
              step >= 1 ? "border-accent text-accent" : "border-border text-textSecondary"
            }`}
          >
            1. Basics
          </div>
          <div
            className={`py-2 border-b-2 ${
              step >= 2 ? "border-accent text-accent" : "border-border text-textSecondary"
            }`}
          >
            2. Quantities
          </div>
          <div
            className={`py-2 border-b-2 ${
              step === 3 ? "border-accent text-accent" : "border-border text-textSecondary"
            }`}
          >
            3. TNA Milestones
          </div>
        </div>

        {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

        <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-sm">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                  PO Number *
                </label>
                <input
                  type="text"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                  placeholder="e.g. B-PO-88295"
                  className="w-full px-3 py-2 border border-border rounded-md text-textPrimary tap-target"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                  Buyer *
                </label>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-textPrimary bg-white tap-target"
                >
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                  Style Description *
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="e.g. Men's heavy pique polo, charcoal"
                  className="w-full px-3 py-2 border border-border rounded-md text-textPrimary tap-target"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                  Ex-Factory Date *
                </label>
                <input
                  type="date"
                  value={exFactoryDate}
                  onChange={(e) => setExFactoryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-textPrimary tap-target"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md font-medium text-sm transition-colors tap-target"
                >
                  Next: Quantities →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Quantities Grid */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-textPrimary text-sm sm:text-base">Colour & Size Breakdown</h3>
                <span className="text-xs sm:text-sm font-bold bg-accent-subtle text-accent px-2.5 py-1 rounded">
                  Total: {totalQty.toLocaleString()} pcs
                </span>
              </div>

              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Colour"
                      value={line.colour}
                      onChange={(e) => updateLine(idx, "colour", e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-border rounded text-xs sm:text-sm tap-target"
                    />
                    <input
                      type="text"
                      placeholder="Size"
                      value={line.size}
                      onChange={(e) => updateLine(idx, "size", e.target.value)}
                      className="w-20 px-3 py-1.5 border border-border rounded text-xs sm:text-sm tap-target"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, "qty", parseInt(e.target.value) || 0)}
                      className="w-28 px-3 py-1.5 border border-border rounded text-xs sm:text-sm tap-target"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                      className="text-gray-400 hover:text-rose-600 disabled:opacity-30 p-2"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-accent hover:underline inline-block mt-2"
              >
                + Add Colour / Size Row
              </button>

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-surface tap-target"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md font-medium text-sm transition-colors tap-target"
                >
                  Next: TNA Template →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Template & Milestones Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                  Choose TNA Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-textPrimary bg-white tap-target"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                  Auto Back-Calculated Schedule from Ex-Factory ({exFactoryDate})
                </h4>
                <div className="border border-border rounded-md overflow-hidden bg-surface">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-b border-border text-textSecondary">
                      <tr>
                        <th className="py-2 px-3">Stage</th>
                        <th className="py-2 px-3">Planned Start</th>
                        <th className="py-2 px-3">Planned End</th>
                        <th className="py-2 px-3 text-right">Target Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {milestonesPreview.map((m: any, idx: number) => (
                        <tr key={idx} className="bg-white">
                          <td className="py-2 px-3 font-semibold text-textPrimary">{m.stage}</td>
                          <td className="py-2 px-3 text-textSecondary">{m.plannedStart}</td>
                          <td className="py-2 px-3 font-medium text-textPrimary">{m.plannedEnd}</td>
                          <td className="py-2 px-3 text-right font-semibold text-accent">
                            {totalQty.toLocaleString()} pcs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                Milestones are automatically scheduled working backwards from your ex-factory date using standard process lead times.
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-surface tap-target"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md font-semibold text-sm transition-colors disabled:opacity-50 tap-target"
                >
                  {submitting ? "Creating Order..." : "Create Order & Initialize TNA"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
