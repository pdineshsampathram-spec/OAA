"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { AnimatePresence } from "framer-motion";
import { SessionProvider } from "next-auth/react";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd] dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-neutral-900 dark:border-neutral-100 animate-spin h-12 w-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen bg-[#fbfbfd] dark:bg-black overflow-hidden flex text-neutral-900 dark:text-white">

      {/* Sidebar navigation */}
      <Sidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col md:pl-[80px] lg:pl-[260px] min-h-screen transition-all duration-300">
        {/* Top header navigation */}
        <TopBar onOpenMobileSidebar={() => setIsMobileOpen(true)} />

        {/* Dynamic Inner Content */}
        <main className="flex-grow p-6 overflow-y-auto max-w-[1600px] w-full mx-auto relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            {children}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SessionProvider>
  );
}
