'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users,
  ClipboardCheck,
  BarChart3,
  FileText,
  Brain,
  Settings, 
  LogOut,
  X,
  User,
  Calendar,
  GraduationCap,
  Trophy,
  ShieldAlert,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Navigation items per role
const adminNavItems = [
  { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
  { name: 'Students', href: '/dashboard/admin/students', icon: Users },
  { name: 'Marks', href: '/dashboard/admin/marks', icon: BookOpen },
  { name: 'Attendance', href: '/dashboard/admin/attendance', icon: ClipboardCheck },
  { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
  { name: 'Data Ingestion', href: '/dashboard/admin/ingest', icon: FileSpreadsheet },
  { name: 'AI Insights', href: '/dashboard/admin/ai-insights', icon: Brain },
  { name: 'Leaderboard', href: '/dashboard/admin/leaderboard', icon: Trophy },
  { name: 'Class Potential', href: '/dashboard/admin/class-potential', icon: BarChart3 },
  { name: 'Discipline', href: '/dashboard/admin/discipline', icon: ShieldAlert },
  { name: 'Chat Monitor', href: '/dashboard/admin/chat-monitor', icon: MessageSquare },
];

const studentNavItems = [
  { name: 'Overview', href: '/dashboard/student', icon: LayoutDashboard },
  { name: 'My Marks', href: '/dashboard/student/marks', icon: BookOpen },
  { name: 'My Attendance', href: '/dashboard/student/attendance', icon: Calendar },
  { name: 'My Profile', href: '/dashboard/student/profile', icon: User },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const isStudent = session?.user?.role === 'student';
  const navItems = isStudent ? studentNavItems : adminNavItems;
  const settingsHref = isStudent ? '/dashboard/student/profile' : '/dashboard/admin/settings';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-black/[0.04]",
          "bg-white transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-black/[0.04]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              OAA<span className="text-indigo-600">.ai</span>
            </span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-6 py-3 border-b border-black/[0.04]">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
            isStudent 
              ? "bg-emerald-50 text-emerald-700" 
              : "bg-indigo-50 text-indigo-700"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isStudent ? "bg-emerald-500" : "bg-indigo-500"
            )} />
            {isStudent ? "Student Portal" : "Admin Portal"}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard/admin' && item.href !== '/dashboard/student' && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} onClick={onClose}>
                <div
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn(
                    "h-[18px] w-[18px]",
                    isActive 
                      ? "text-indigo-600" 
                      : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  {item.name}
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav"
                      className="absolute left-0 top-1/4 h-1/2 w-[3px] rounded-r-full bg-indigo-600"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-black/[0.04] p-3 space-y-0.5">
          {!isStudent && (
            <Link href={settingsHref} onClick={onClose}>
              <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <Settings className="h-[18px] w-[18px] text-gray-400" />
                Settings
              </div>
            </Link>
          )}
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
