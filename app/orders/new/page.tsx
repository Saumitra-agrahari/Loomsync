"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { addDays } from "@/lib/runrate";
import { ErrorBanner } from "@/components/States";
import { useI18n } from "@/lib/i18n";

export default function NewOrderPage() {
  const router = useRouter();
  const { t, translateStage } = useI18n();

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
        setError(t("setup.poRequired"));
        return;
      }
      if (!style.trim()) {
        setError(t("setup.styleRequired"));
        return;
      }
      if (!exFactoryDate) {
        setError(t("setup.exDateRequired"));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (totalQty <= 0) {
        setError(t("setup.qtyPositiveRequired"));
        return;
      }
      for (const line of lines) {
        if (!line.colour.trim() || !line.size.trim() || line.qty <= 0) {
          setError(t("setup.qtyPositiveRequired"));
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
        setError(data.error?.message || t("errors.unknownError"));
        if (data.error?.fields) setFieldErrors(data.error.fields);
        setSubmitting(false);
        return;
      }

      router.push(`/orders/${data.order.id}`);
    } catch {
      setError(t("errors.networkError"));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-textPrimary">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline focus-ring rounded mb-2"
          >
            {t("detail.backToBoard")}
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-textPrimary tracking-tight">
            {t("setup.title")}
          </h1>
          <p className="text-xs sm:text-sm text-textMuted mt-0.5">
            {t("setup.subtitle")}
          </p>
        </div>

        {/* Step indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-2.5 border-b-2 transition-colors focus-ring rounded-t ${
              step >= 1 ? "border-accent text-accent" : "border-border text-textMuted"
            }`}
          >
            {t("setup.stepBasics")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (poNo && style && exFactoryDate) setStep(2);
            }}
            className={`py-2.5 border-b-2 transition-colors focus-ring rounded-t ${
              step >= 2 ? "border-accent text-accent" : "border-border text-textMuted"
            }`}
          >
            {t("setup.stepQuantities")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (poNo && style && exFactoryDate && totalQty > 0) setStep(3);
            }}
            className={`py-2.5 border-b-2 transition-colors focus-ring rounded-t ${
              step === 3 ? "border-accent text-accent" : "border-border text-textMuted"
            }`}
          >
            {t("setup.stepMilestones")}
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="po-no-input"
                  className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1"
                >
                  {t("setup.poLabel")}
                </label>
                <input
                  id="po-no-input"
                  type="text"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                  placeholder={t("setup.poPlaceholder")}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary text-sm font-mono focus-ring tap-target"
                />
              </div>

              <div>
                <label
                  htmlFor="buyer-select"
                  className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1"
                >
                  {t("setup.buyerLabel")}
                </label>
                <select
                  id="buyer-select"
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary text-sm focus-ring tap-target"
                >
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="style-input"
                  className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1"
                >
                  {t("setup.styleLabel")}
                </label>
                <input
                  id="style-input"
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder={t("setup.stylePlaceholder")}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary text-sm focus-ring tap-target"
                />
              </div>

              <div>
                <label
                  htmlFor="ex-date-input"
                  className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1"
                >
                  {t("setup.exDateLabel")}
                </label>
                <input
                  id="ex-date-input"
                  type="date"
                  value={exFactoryDate}
                  onChange={(e) => setExFactoryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary text-sm focus-ring tap-target font-mono"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-sm transition-colors focus-ring tap-target shadow-xs"
                >
                  {t("setup.nextQuantities")}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Quantities Grid */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-textPrimary text-sm sm:text-base">
                  {t("setup.breakdownTitle")}
                </h3>
                <span className="text-xs sm:text-sm font-bold bg-surface-raised border border-border text-textPrimary px-3 py-1 rounded-full font-mono tabular-nums">
                  {t("setup.totalBadge", { total: totalQty.toLocaleString() })}
                </span>
              </div>

              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("setup.colourPlaceholder")}
                      value={line.colour}
                      onChange={(e) => updateLine(idx, "colour", e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary text-xs sm:text-sm focus-ring tap-target"
                    />
                    <input
                      type="text"
                      placeholder={t("setup.sizePlaceholder")}
                      value={line.size}
                      onChange={(e) => updateLine(idx, "size", e.target.value)}
                      className="w-20 px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary text-xs sm:text-sm focus-ring tap-target"
                    />
                    <input
                      type="number"
                      placeholder={t("setup.qtyPlaceholder")}
                      min="1"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, "qty", parseInt(e.target.value) || 0)}
                      className="w-28 px-3 py-2 border border-border rounded-lg bg-surface text-textPrimary text-xs sm:text-sm font-mono tabular-nums focus-ring tap-target"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                      className="text-textMuted hover:text-status-red disabled:opacity-30 p-2 focus-ring rounded"
                      title={t("setup.removeRow")}
                      aria-label={t("setup.removeRow")}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-accent hover:underline inline-block mt-2 focus-ring rounded p-1"
              >
                {t("setup.addRow")}
              </button>

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-textPrimary hover:bg-surface-hover focus-ring tap-target"
                >
                  {t("setup.backButton")}
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold text-sm transition-colors focus-ring tap-target shadow-xs"
                >
                  {t("setup.nextMilestones")}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Template & Milestones Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="template-select"
                  className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-1"
                >
                  {t("setup.templateLabel")}
                </label>
                <select
                  id="template-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-textPrimary text-sm focus-ring tap-target"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-2">
                  {t("setup.previewTitle", { date: exFactoryDate })}
                </h4>
                <div className="border border-border rounded-lg overflow-hidden bg-surface">
                  <table className="w-full text-xs text-left divide-y divide-border">
                    <thead className="bg-surface-raised text-textMuted uppercase tracking-wider text-[11px] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">{t("setup.tableStage")}</th>
                        <th className="py-2.5 px-3">{t("setup.tableStart")}</th>
                        <th className="py-2.5 px-3">{t("setup.tableEnd")}</th>
                        <th className="py-2.5 px-3 text-right">{t("setup.tableTarget")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface font-mono tabular-nums">
                      {milestonesPreview.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-hover/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-textPrimary font-sans">
                            {translateStage(m.stage)}
                          </td>
                          <td className="py-2.5 px-3 text-textMuted">{m.plannedStart}</td>
                          <td className="py-2.5 px-3 font-semibold text-textPrimary">{m.plannedEnd}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-accent">
                            {totalQty.toLocaleString()} {t("common.pcs")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3.5 bg-surface-raised border border-border rounded-lg text-xs text-textMuted leading-relaxed">
                {t("setup.previewNotice")}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-textPrimary hover:bg-surface-hover focus-ring tap-target"
                >
                  {t("setup.backButton")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 focus-ring tap-target shadow-xs"
                >
                  {submitting ? t("setup.creatingButton") : t("setup.createButton")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
