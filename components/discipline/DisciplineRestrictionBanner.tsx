"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisciplineRestrictionBannerProps {
  restriction: "none" | "flag_only" | "read_only" | "locked";
}

export default function DisciplineRestrictionBanner({ restriction }: DisciplineRestrictionBannerProps) {
  if (restriction === "none") return null;

  return (
    <AnimatePresence>
      {restriction === "locked" ? (
        /* Full lockout overlay */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-gradient-to-br from-rose-950/95 to-slate-950/95 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center space-y-6"
          >
            <div className="mx-auto w-20 h-20 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Lock className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-slate-800">Account Suspended</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your account has been suspended due to multiple disciplinary actions. 
                All portal features are currently disabled.
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 space-y-1">
              <p className="font-bold">What happens next?</p>
              <p>A formal suspension review will be conducted by the administration.</p>
              <p>You will be notified of the outcome.</p>
            </div>
            <a
              href="mailto:admin@school.edu"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
            >
              <Mail className="w-4 h-4" />
              Contact Administration
            </a>
          </motion.div>
        </motion.div>
      ) : (
        /* Warning / Read-only banner */
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className={cn(
            "w-full px-4 py-3 flex items-center gap-3 border-b",
            restriction === "read_only"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-orange-50 border-orange-200 text-orange-800"
          )}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">
            {restriction === "read_only"
              ? "Your collaboration features are limited due to disciplinary flags. You can read messages but cannot send them or create teams."
              : "Your profile has been flagged due to a disciplinary warning. This is visible to all faculty members."}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
