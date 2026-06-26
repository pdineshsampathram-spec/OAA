"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldOff, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const userRole = session?.user?.role || "unknown";

  const getDashboardUrl = (): string => {
    switch (userRole) {
      case "admin":
      case "principal":
        return "/dashboard/admin";
      case "teacher":
        return "/dashboard/admin";
      case "student":
        return "/dashboard/student";
      default:
        return "/login";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-10 max-w-md w-full text-center space-y-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center"
        >
          <ShieldOff className="w-8 h-8 text-rose-500" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Access Denied
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            You don&apos;t have permission to access this page.
          </p>
        </div>

        {/* Role Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-sm">
          <span className="text-slate-400 font-medium">Your Role:</span>
          <span className="text-slate-700 font-bold capitalize">{userRole}</span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => router.push(getDashboardUrl())}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to My Dashboard
        </button>
      </motion.div>
    </div>
  );
}
