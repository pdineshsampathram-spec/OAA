"use client";

import PeerChatPanel from "@/components/chat/PeerChatPanel";
import PageTransition from "@/components/layout/PageTransition";
import { MessageSquare } from "lucide-react";

export default function ChatMonitorPage() {
  return (
    <PageTransition>
      <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-24">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-indigo-500" />
              Chat Moderation Monitor
            </h1>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Monitor peer communication networks and moderate flagged contents or warnings in real-time.
            </p>
          </div>
        </div>

        {/* Chat Panel */}
        <PeerChatPanel />
      </div>
    </PageTransition>
  );
}
