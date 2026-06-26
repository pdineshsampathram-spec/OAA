'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, Bell, Search, User } from 'lucide-react';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
}

function SearchInput({ role }: { role: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [searchVal, setSearchVal] = useState(urlSearch);

  useEffect(() => {
    setSearchVal(urlSearch);
  }, [urlSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = searchVal.trim();
      const targetUrl = role === 'student'
        ? `/dashboard/student?search=${encodeURIComponent(trimmed)}`
        : `/dashboard/admin/students?search=${encodeURIComponent(trimmed)}`;
      router.push(targetUrl);
    }
  };

  return (
    <div className="hidden md:flex items-center relative">
      <Search className="absolute left-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
      <input 
        type="text" 
        value={searchVal}
        onChange={(e) => setSearchVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search students..." 
        className="h-10 w-80 rounded-full border border-black/[0.04] bg-slate-100 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 transition-all"
      />
    </div>
  );
}

export default function TopBar({ onOpenMobileSidebar }: TopBarProps) {
  const { data: session } = useSession();
  const role = session?.user?.role || "staff";
  const name = session?.user?.name || "Faculty Member";
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-black/[0.04] bg-white/70 px-6 backdrop-blur-2xl dark:border-white/[0.04] dark:bg-[#1d1d1f]/70">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search */}
        <Suspense fallback={<div className="hidden md:block h-10 w-80 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />}>
          <SearchInput role={role} />
        </Suspense>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
          </span>
        </button>

        <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">{name}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-500">{displayRole} Portal</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.04] bg-slate-100 dark:border-white/10 dark:bg-gradient-to-tr dark:from-zinc-800 dark:to-zinc-700 shadow-sm overflow-hidden">
            <User className="h-5 w-5 text-slate-400 dark:text-zinc-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
