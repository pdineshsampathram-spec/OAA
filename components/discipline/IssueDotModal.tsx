"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface IssueDotModalProps {
  studentId: string;
  studentName: string;
  currentDotCount: number;
  onSuccess: () => void;
}

function getConsequencePreview(newCount: number): { action: string; restriction: string; color: string } {
  if (newCount >= 5) {
    return {
      action: "Suspension Review",
      restriction: "Full Account Lockout — excluded from leaderboards",
      color: "text-rose-600 bg-rose-50 border-rose-200",
    };
  }
  if (newCount >= 3) {
    return {
      action: "Mandatory Hearing",
      restriction: "Read-Only Chat Access — cannot create teams",
      color: "text-orange-600 bg-orange-50 border-orange-200",
    };
  }
  return {
    action: "Formal Warning",
    restriction: "Profile Flagged — visible to faculty",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  };
}

export default function IssueDotModal({
  studentId,
  studentName,
  currentDotCount,
  onSuccess,
}: IssueDotModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const newCount = currentDotCount + 1;
  const consequence = getConsequencePreview(newCount);
  const canSubmit = reason.length >= 20 && confirmed && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/discipline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to issue red dot");
      }

      setShowSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setShowSuccess(false);
        setReason("");
        setConfirmed(false);
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Issue Warning
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
                {showSuccess ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center gap-4 py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30"
                    >
                      <span className="text-white text-2xl font-bold">{newCount}</span>
                    </motion.div>
                    <p className="text-sm font-bold text-slate-800">Red dot issued successfully</p>
                  </motion.div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-800">Issue Red Dot</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Issuing to <strong className="text-slate-600">{studentName}</strong> — Current: {currentDotCount} dot(s)
                        </p>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>

                    {/* Consequence Preview */}
                    <div className={cn("p-4 rounded-xl border text-xs space-y-1", consequence.color)}>
                      <p className="font-bold">⚠ Consequence Preview (Dot #{newCount})</p>
                      <p>Action: <strong>{consequence.action}</strong></p>
                      <p>Restriction: {consequence.restriction}</p>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Reason for Issuance *
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe the incident in detail (min 20 characters)..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none transition"
                      />
                      <p className={cn("text-[10px] font-semibold", reason.length >= 20 ? "text-emerald-500" : "text-slate-400")}>
                        {reason.length}/20 minimum characters
                      </p>
                    </div>

                    {/* Confirmation */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        I confirm this action is recorded and irreversible. This will affect the student&apos;s OAA behavior score.
                      </span>
                    </label>

                    {/* Error */}
                    {error && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                        {error}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg",
                          canSubmit
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                      >
                        {submitting ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        Issue Red Dot
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
