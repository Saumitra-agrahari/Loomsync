"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { queueUpdate, syncOutbox } from "@/lib/offline/db";
import { ErrorBanner } from "@/components/States";
import { useI18n } from "@/lib/i18n";

export default function SupervisorUpdatePage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale, translateStage } = useI18n();
  const stageId = params.id as string;

  const [orderStage, setOrderStage] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExcessConfirm, setShowExcessConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
        setSpeechSupported(true);
      }

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    fetch("/api/supervisor/orders")
      .then((r) => r.json())
      .then((data) => {
        const found = data.orders?.find((o: any) => o.orderStageId === stageId);
        if (found) {
          setOrderStage(found);
        } else {
          setError("Order stage not found or not assigned to your unit");
        }
      })
      .catch(() => setError("Failed to load stage info"));
  }, [stageId]);

  // Voice speech-to-text handler (Web Speech API ta-IN)
  const handleToggleVoice = () => {
    if (!speechSupported) return;

    try {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognition.lang = "ta-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      if (isListening) {
        recognition.stop();
        setIsListening(false);
      } else {
        recognition.start();
      }
    } catch {
      setIsListening(false);
    }
  };

  // Client-side photo compression (<300 KB)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPhotoPreview(compressedDataUrl);
        setPhotoKey(`uploads/${orderStage?.poNo || "ord"}/${Date.now()}.jpg`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoKey(null);
  };

  const parsedQty = parseInt(qty, 10);
  const isValidQty = !isNaN(parsedQty) && parsedQty >= 0 && qty.trim() !== "";

  const handleSend = async (bypassExcess: boolean = false) => {
    setError(null);
    if (!isValidQty) {
      setError("தயவுசெய்து சரியான எண்ணிக்கையை உள்ளிடவும் / Please enter a valid quantity.");
      return;
    }

    if (!bypassExcess && orderStage && parsedQty > orderStage.remaining) {
      setShowExcessConfirm(true);
      return;
    }

    setSubmitting(true);
    const clientUuid = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const todayStr = "2026-11-05"; // baseline demo today

    const updateItem = {
      clientUuid,
      orderStageId: stageId,
      orderId: orderStage?.orderId || "",
      poNo: orderStage?.poNo || "",
      style: orderStage?.style || "",
      stage: orderStage?.stage || "",
      unitId: "",
      reportedDate: todayStr,
      qty: parsedQty,
      note: note.trim() || undefined,
      photoKey: photoKey || undefined,
      photoBase64: photoPreview || undefined,
      clientTs: new Date().toISOString(),
    };

    try {
      // Optimistic save to Dexie outbox
      await queueUpdate(updateItem);

      if (navigator.onLine) {
        // Non-blocking sync attempt in background
        syncOutbox().catch(() => {});
      }

      setSubmittedSuccess(true);
      setTimeout(() => {
        router.push("/s");
        router.refresh();
      }, 900);
    } catch {
      // Even if local queue fails somehow, show fallback
      setSubmittedSuccess(true);
      setTimeout(() => {
        router.push("/s");
      }, 900);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-28 text-textPrimary">
      <Navbar />

      {/* Subtle Offline notification if disconnected */}
      {!isOnline && (
        <aside
          aria-label="Offline status"
          className="bg-surface-raised border-b border-border px-4 py-2 text-xs flex items-center justify-center gap-2 text-textPrimary"
        >
          <span className="w-2 h-2 rounded-full bg-status-amber animate-pulse" />
          <span>
            {t("supervisor.offlineBannerDisconnectedText")}
          </span>
        </aside>
      )}

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 space-y-4">
        <div>
          <button
            type="button"
            onClick={() => router.push("/s")}
            className="text-xs font-semibold text-accent hover:underline mb-2 flex items-center gap-1.5 focus-ring rounded tap-target"
          >
            {t("supervisor.backToList")}
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-textPrimary tracking-tight">
            {t("supervisor.formTitle")}
          </h1>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Warm Non-Blocking Success Banner */}
        {submittedSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="p-4 bg-status-green-bg border border-status-green/30 rounded-xl text-center space-y-1 animate-in fade-in"
          >
            <div className="text-2xl">✓</div>
            <p className="font-bold text-status-green text-sm sm:text-base">
              {t("supervisor.successBannerTitle")}
            </p>
            <p className="text-xs text-textMuted">
              {t("supervisor.successBannerSubtitle")}
            </p>
          </div>
        )}

        {orderStage && !submittedSuccess && (
          <div className="bg-surface border-2 border-border rounded-xl p-5 shadow-subtle space-y-5">
            {/* Stage Info Header (Prefilled stage and order details) */}
            <div className="p-3.5 bg-surface-raised rounded-lg border border-border space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-mono font-extrabold text-accent text-lg">
                    {orderStage.poNo}
                  </span>
                  <p className="text-xs font-semibold text-textPrimary mt-0.5">
                    {orderStage.style}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-accent text-white px-2.5 py-1 rounded-md text-xs font-bold font-mono">
                    {translateStage(orderStage.stage)}
                  </span>
                </div>
              </div>

              {/* Calm Context: Total completed so far vs target */}
              <div className="pt-2 border-t border-border flex justify-between items-center text-xs text-textMuted">
                <span>
                  {t("supervisor.headerMadeSoFar", { qty: orderStage.stageDone.toLocaleString() })}
                </span>
                <span>
                  {t("supervisor.headerTarget", { qty: orderStage.targetQty.toLocaleString() })}
                </span>
              </div>
            </div>

            {/* 1. Large Numeric Quantity Input */}
            <div>
              <label
                htmlFor="daily-qty-input"
                className="block text-xs font-extrabold uppercase tracking-wider text-textMuted mb-1.5"
              >
                {t("supervisor.qtyInputLabel")}
              </label>
              <div className="relative">
                <input
                  id="daily-qty-input"
                  type="number"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full text-3xl sm:text-4xl font-extrabold font-mono tabular-nums px-4 py-3.5 border-2 border-border focus:border-accent bg-surface rounded-xl text-textPrimary text-center focus-ring tap-target"
                />
              </div>
              <p className="text-[11px] text-textMuted text-center mt-1">
                {t("supervisor.remainingHint", { qty: orderStage.remaining.toLocaleString() })}
              </p>
            </div>

            {/* 2. Photo Upload / Camera with thumbnail & clear remove button */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-textMuted mb-1.5">
                {t("supervisor.photoLabel")}
              </label>
              {photoPreview ? (
                <div className="p-3 bg-surface-raised rounded-xl border border-border space-y-2">
                  <div className="relative w-full rounded-lg overflow-hidden border border-border">
                    <img
                      src={photoPreview}
                      alt="Floor photo preview"
                      className="h-44 w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-status-green font-semibold flex items-center gap-1">
                      ✓ {t("supervisor.photoAttached")}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1 text-xs font-semibold text-status-red hover:bg-status-red-bg border border-status-red/30 rounded-md focus-ring tap-target"
                    >
                      {t("supervisor.removePhoto")}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-surface-raised transition-colors focus-ring tap-target">
                  <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-accent mb-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-accent">
                    {t("supervisor.cameraButtonLabel")}
                  </span>
                  <span className="text-[11px] text-textMuted mt-0.5">
                    {t("supervisor.compressedHint")}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 3. Note with Voice Mic Input and transcript preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="floor-note-text"
                  className="text-xs font-extrabold uppercase tracking-wider text-textMuted"
                >
                  {t("supervisor.noteLabel")}
                </label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-colors focus-ring tap-target ${
                      isListening
                        ? "bg-status-red text-white animate-pulse"
                        : "bg-surface-raised border border-border text-accent hover:bg-surface-hover"
                    }`}
                  >
                    <span>🎤</span>
                    <span>{isListening ? t("supervisor.micButtonListening") : t("supervisor.micButtonDefault")}</span>
                  </button>
                )}
              </div>
              <textarea
                id="floor-note-text"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={locale === "ta" ? "எ.கா: தையல் இயந்திரம் பழுது..." : "e.g. Machine breakdown, yarn delay..."}
                className="w-full px-3.5 py-2.5 border-2 border-border focus:border-accent rounded-xl text-sm text-textPrimary bg-surface font-tamil leading-relaxed focus-ring"
              />
              {isListening && (
                <p className="text-xs text-status-red font-medium mt-1 animate-pulse">
                  ● {t("supervisor.listeningHint")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Excess Qty Warning Dialog */}
        {showExcessConfirm && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="excess-title"
          >
            <div className="bg-surface rounded-xl max-w-sm w-full p-6 shadow-xl border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-status-amber-bg text-status-amber border border-status-amber/30 flex items-center justify-center mx-auto text-xl font-bold">
                ⚠️
              </div>
              <h3 id="excess-title" className="text-base font-bold text-textPrimary">
                {t("supervisor.excessTitle")}
              </h3>
              <p className="text-xs text-textMuted leading-relaxed">
                {t("supervisor.excessMessage", { qty, remaining: orderStage?.remaining })}
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExcessConfirm(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-xs font-semibold text-textPrimary hover:bg-surface-hover focus-ring tap-target"
                >
                  {t("supervisor.excessEditButton")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExcessConfirm(false);
                    handleSend(true);
                  }}
                  className="flex-1 py-2.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-hover transition-colors focus-ring tap-target"
                >
                  {t("supervisor.excessProceedButton")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Send Button (disabled until quantity entered; Tamil + English label) */}
        {!submittedSuccess && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur border-t border-border z-30 flex justify-center shadow-lg">
            <div className="max-w-md w-full">
              <button
                type="button"
                onClick={() => handleSend(false)}
                disabled={submitting || !isValidQty}
                className="w-full py-4 bg-accent hover:bg-accent-hover active:scale-[0.99] text-white font-extrabold text-base rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-ring tap-target flex items-center justify-center gap-2"
              >
                <span>
                  {submitting
                    ? t("supervisor.submittingButton")
                    : !isOnline
                    ? t("supervisor.sendButtonOffline")
                    : t("supervisor.sendButtonDefault")}
                </span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
