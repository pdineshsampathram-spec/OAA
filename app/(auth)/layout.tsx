"use client";

import { SessionProvider } from "next-auth/react";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="relative min-h-screen flex flex-col bg-[#F5F5F5]">
        {/* Minimal top nav */}
        <nav className="w-full bg-white/70 backdrop-blur-xl border-b border-black/[0.04] z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                OAA<span className="text-indigo-600">.ai</span>
              </span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="relative z-10 w-full flex flex-col items-center justify-center">
            {children}
          </div>
        </div>

        {/* Subtle decorative elements */}
        <div className="fixed top-1/4 left-10 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-10 w-96 h-96 bg-purple-200/15 rounded-full blur-3xl pointer-events-none" />
      </div>
    </SessionProvider>
  );
}
