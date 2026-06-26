"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "danger" | "warning";
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  variant = "warning",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialog.Portal forceMount>
            {/* Backdrop Overlay */}
            <AlertDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-[2px]"
              />
            </AlertDialog.Overlay>

            {/* Dialog Content */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <AlertDialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 flex flex-col gap-4 focus:outline-none"
                >
                  <div>
                    <AlertDialog.Title className="text-lg font-bold text-slate-800">
                      {title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="text-sm text-slate-500 mt-2 leading-relaxed">
                      {description}
                    </AlertDialog.Description>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-2">
                    <AlertDialog.Cancel asChild>
                      <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
                      >
                        {cancelLabel}
                      </button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition ${
                          isDanger
                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/10"
                            : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
                        }`}
                      >
                        {confirmLabel}
                      </button>
                    </AlertDialog.Action>
                  </div>
                </motion.div>
              </AlertDialog.Content>
            </div>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
