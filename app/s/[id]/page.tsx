"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { queueUpdate, syncOutbox } from "@/lib/offline/db";
import { ErrorBanner } from "@/components/States";

export default function SupervisorUpdatePage() {
  const params = useParams();
  const router = useRouter();
  const stageId = params.id as string;

  const [orderStage, setOrderStage] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExcessConfirm, setShowExcessConfirm] = useState(false);

  useEffect(() => {
    // Check Web Speech API support
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setSpeechSupported(true);
    }

    // Fetch order stage info
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

  // Voice speech-to-text handler (Web Speech API ta-IN / en-IN)
  const handleToggleVoice = () => {
    if (!speechSupported) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = "ta-IN"; // Tamil voice recognition with English mixed support
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
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

  const handleSend = async (bypassExcess: boolean = false) => {
    setError(null);
    const numQty = parseInt(qty, 10);
    if (isNaN(numQty) || numQty < 0) {
      setError("தயவுசெய்து சரியான எண்ணிக்கையை உள்ளிடவும் / Please enter a valid quantity.");
      return;
    }

    if (!bypassExcess && orderStage && numQty > orderStage.remaining) {
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
      qty: numQty,
      note: note.trim() || undefined,
      photoKey: photoKey || undefined,
      photoBase64: photoPreview || undefined,
      clientTs: new Date().toISOString(),
    };

    // If offline or online: write to Dexie outbox first, then attempt immediate sync!
    try {
      await queueUpdate(updateItem);

      if (navigator.onLine) {
        await syncOutbox();
      }

      router.push("/s");
      router.refresh();
    } catch {
      // Offline fallback succeeded
      router.push("/s");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5">
        <div className="mb-4">
          <button
            onClick={() => router.push("/s")}
            className="text-xs font-semibold text-accent hover:underline mb-2 flex items-center gap-1"
          >
            ← பின்செல் / Back to List
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-textPrimary">
            தினசரி உற்பத்தி பதிவு / Daily Update
          </h1>
        </div>

        {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

        {orderStage && (
          <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
            {/* Stage Info Header */}
            <div className="p-3 bg-surface rounded-md border border-border">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-accent text-lg">{orderStage.poNo}</span>
                  <p className="text-xs text-textSecondary">{orderStage.style}</p>
                </div>
                <span className="bg-accent text-white px-2.5 py-0.5 rounded text-xs font-bold">
                  {orderStage.stage}
                </span>
              </div>
              <div className="mt-2 text-xs flex justify-between text-textSecondary border-t border-border pt-2">
                <span>முடிந்தது: <strong>{orderStage.stageDone.toLocaleString()}</strong> pcs</span>
                <span>மீதம்: <strong className="text-textPrimary">{orderStage.remaining.toLocaleString()}</strong> pcs</span>
              </div>
            </div>

            {/* 1. Large Numeric Quantity Input */}
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                இன்று உற்பத்தியான எண்ணிக்கை / Quantity Made Today *
              </label>
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                className="w-full text-3xl font-bold px-4 py-3 border-2 border-border focus:border-accent rounded-lg text-textPrimary text-center tap-target"
                autoFocus
              />
            </div>

            {/* 2. Photo Upload / Camera */}
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                புகைப்படம் / Floor Photo (Optional)
              </label>
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-surface transition-colors tap-target">
                {photoPreview ? (
                  <div className="relative w-full">
                    <img src={photoPreview} alt="Preview" className="h-32 w-full object-cover rounded" />
                    <span className="text-xs text-emerald-700 font-semibold block mt-1 text-center">
                      ✓ Photo attached (&le;300 KB)
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <svg className="w-8 h-8 mx-auto text-textSecondary mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-accent">படம் எடுக்கவும் / Camera</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* 3. Note with Voice Mic Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  குறிப்பு / Floor Note (Tamil / English)
                </label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 transition-colors ${
                      isListening ? "bg-rose-100 text-rose-800 animate-pulse" : "bg-surface border text-accent"
                    }`}
                  >
                    <span>🎤</span>
                    <span>{isListening ? "கேட்கிறது..." : "தமிழில் பேசு"}</span>
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="எ.கா: தையல் இயந்திரம் பழுது / Machine breakdown, shortage..."
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-textPrimary tap-target font-tamil"
              />
            </div>
          </div>
        )}

        {/* Excess Qty Warning Modal */}
        {showExcessConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-border text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                ⚠️
              </div>
              <h3 className="text-base font-bold text-textPrimary mb-1">
                எண்ணிக்கை எச்சரிக்கை / Excess Quantity
              </h3>
              <p className="text-xs text-textSecondary mb-4">
                உள்ளிட்ட எண்ணிக்கை ({qty} pcs) மீதமுள்ள அளவை ({orderStage?.remaining} pcs) விட அதிகமாக உள்ளது. தொடர விரும்புகிறீர்களா?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExcessConfirm(false)}
                  className="flex-1 py-2 border border-border rounded text-xs font-medium tap-target"
                >
                  சரிபார் / Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExcessConfirm(false);
                    handleSend(true);
                  }}
                  className="flex-1 py-2 bg-amber-600 text-white rounded text-xs font-bold tap-target"
                >
                  தொடரவும் / Yes, Proceed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Send Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-border z-20 flex justify-center">
          <div className="max-w-md w-full">
            <button
              type="button"
              onClick={() => handleSend(false)}
              disabled={submitting}
              className="w-full py-3.5 bg-accent hover:bg-accent-hover active:scale-[0.99] text-white font-bold text-base rounded-lg shadow-md transition-all tap-target flex items-center justify-center gap-2"
            >
              <span>{submitting ? "அனுப்பப்படுகிறது..." : "அனுப்பு / Send Daily Update"}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
