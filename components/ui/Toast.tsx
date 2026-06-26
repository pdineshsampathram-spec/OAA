"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id?: string;
  title?: string;
  description: string;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastProps extends ToastMessage {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const variantClasses = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-rose-50 border-rose-200 text-rose-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-indigo-50 border-indigo-200 text-indigo-800",
};

const progressClasses = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-indigo-500",
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  duration = 3000,
}: ToastProps) {
  const Icon = icons[variant];

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={duration}
      asChild
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`pointer-events-auto relative flex flex-col w-full max-w-sm rounded-2xl border shadow-lg overflow-hidden p-4 ${variantClasses[variant]}`}
          >
            <div className="flex gap-3">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {title && <ToastPrimitive.Title className="text-sm font-bold">{title}</ToastPrimitive.Title>}
                <ToastPrimitive.Description className="text-xs font-medium leading-relaxed">
                  {description}
                </ToastPrimitive.Description>
              </div>
              <ToastPrimitive.Close asChild>
                <button className="text-current opacity-60 hover:opacity-100 transition p-0.5 rounded-lg hover:bg-black/5 self-start">
                  <X className="w-4 h-4" />
                </button>
              </ToastPrimitive.Close>
            </div>

            {/* Draining Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className={`h-full ${progressClasses[variant]}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastPrimitive.Root>
  );
}

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement>
>((props, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className="fixed bottom-0 right-0 z-50 flex flex-col p-6 gap-3 w-full max-w-md pointer-events-none focus:outline-none"
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";
