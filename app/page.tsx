import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  BarChart3,
  Brain,
  Shield,
  Zap,
  Target,
  Users,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Activity,
  Award,
  BookOpen,
  AlertTriangle,
  MessageSquare,
  FileText,
  Sparkles,
} from "lucide-react";

/* ---------- Navbar ---------- */
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-black/[0.04]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            OAA<span className="text-indigo-600">.ai</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</a>
          <a href="#scoring" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Scoring</a>
          <a href="#platform" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Platform</a>
          <a href="#about" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">About</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 px-5 py-2.5 rounded-full transition-all shadow-lg shadow-gray-900/10 hover:shadow-gray-900/20"
          >
            Open Portal
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ---------- Hero Section ---------- */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-bg.png"
          alt=""
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-black/[0.06] rounded-full px-4 py-1.5 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-600 tracking-wide">
              AI-Powered Analytics Engine
            </span>
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-gray-900 leading-[0.95] mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Every Student&apos;s
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
            Potential, Scored
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
          A composite scoring engine that weighs academics, skills, and projects
          into one unified leaderboard — with AI-driven behavioral insights.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/login"
            className="group flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-8 py-4 rounded-full transition-all shadow-xl shadow-gray-900/15 hover:shadow-gray-900/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            Open Portal
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#scoring"
            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 px-8 py-4 rounded-full border border-black/[0.08] hover:border-black/[0.15] bg-white/60 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            See How It Works
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Floating stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.5s' }}>
          {[
            { label: "Scoring Pillars", value: "3", icon: Target },
            { label: "Real-time Ranks", value: "∞", icon: TrendingUp },
            { label: "AI Moderation", value: "24/7", icon: Brain },
            { label: "Data Points", value: "50+", icon: Activity },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/70 backdrop-blur-sm border border-black/[0.04] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <stat.icon className="w-5 h-5 text-indigo-500 mb-2" />
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Features Section ---------- */
function FeaturesSection() {
  const features = [
    {
      icon: BookOpen,
      title: "Academic Analysis",
      desc: "Normalize institutional GPAs and exam scores into a universal 0–100 scale for fair cross-section comparison.",
      weight: "40%",
      color: "indigo",
    },
    {
      icon: Award,
      title: "Skill Tracking",
      desc: "Quantify competency velocity across skill trackers, external certifications, and micro-credentials in real time.",
      weight: "30%",
      color: "emerald",
    },
    {
      icon: FileText,
      title: "Project Scoring",
      desc: "Evaluate project complexity, deployment status, team contributions, and repository activity for holistic assessment.",
      weight: "30%",
      color: "amber",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", badge: "bg-indigo-100 text-indigo-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", badge: "bg-amber-100 text-amber-700" },
  };

  return (
    <section id="features" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Core Pillars</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Three Pillars of Assessment
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
            Every student is scored across three weighted dimensions that feed into a single composite OAA score.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => {
            const c = colorMap[f.color];
            return (
              <div
                key={f.title}
                className="group relative bg-white border border-black/[0.04] rounded-3xl p-8 hover:shadow-xl hover:shadow-gray-900/[0.04] transition-all duration-500 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 ${c.bg} ${c.border} border rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <f.icon className={`w-7 h-7 ${c.text}`} />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{f.title}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                    {f.weight}
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Scoring Formula Section ---------- */
function ScoringSection() {
  return (
    <section id="scoring" className="py-24 md:py-32 bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-4 border border-black/[0.04]">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Scoring Engine</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Transparent Composite Algorithm
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
            Every student&apos;s rank is driven by a deterministic, auditable formula — no black boxes.
          </p>
        </div>

        {/* Formula Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-black/[0.04] p-8 md:p-12 shadow-sm">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Composite Formula</p>
              <code className="text-xl md:text-2xl font-bold text-gray-900 font-mono">
                OAA = max(0, [<span className="text-indigo-600">0.40A</span> + <span className="text-emerald-600">0.30S</span> + <span className="text-amber-600">0.30P</span>] − [<span className="text-rose-500">R × 5</span>])
              </code>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pillars */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Score Components</h4>
                {[
                  { letter: "A", label: "Academic Score", weight: "40%", color: "indigo", value: 92 },
                  { letter: "S", label: "Skills Score", weight: "30%", color: "emerald", value: 88 },
                  { letter: "P", label: "Project Score", weight: "30%", color: "amber", value: 85 },
                ].map((item) => (
                  <div key={item.letter} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-${item.color}-50 border border-${item.color}-100 flex items-center justify-center text-sm font-black text-${item.color}-600`}>
                      {item.letter}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                        <span className="text-xs font-bold text-gray-400">{item.weight} weight</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${item.color}-500 rounded-full transition-all duration-1000`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Red Dots */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Penalty System</h4>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <span className="text-sm font-bold text-rose-700">Red Dot Pipeline</span>
                    <span className="text-xs font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full ml-auto">−5 pts each</span>
                  </div>
                  {[
                    { range: "1–2 Dots", desc: "Soft warnings & guardian alerts", severity: "low" },
                    { range: "3–4 Dots", desc: "Chat restrictions & read-only mode", severity: "mid" },
                    { range: "5+ Dots", desc: "Leaderboard lock & suspension", severity: "high" },
                  ].map((r) => (
                    <div key={r.range} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${r.severity === "low" ? "bg-amber-400" : r.severity === "mid" ? "bg-orange-500" : "bg-rose-500"}`} />
                      <div>
                        <span className="font-bold text-gray-800">{r.range}</span>
                        <span className="text-gray-500"> — {r.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Platform Section ---------- */
function PlatformSection() {
  const capabilities = [
    { icon: BarChart3, title: "Real-time Leaderboards", desc: "Live-updating rankings powered by the OAA composite algorithm with instant recalculation." },
    { icon: Brain, title: "AI Risk Prediction", desc: "Machine learning models identify at-risk students before performance drops occur." },
    { icon: MessageSquare, title: "Chat Moderation", desc: "NLP-driven behavioral analysis monitors communication for disciplinary patterns." },
    { icon: Shield, title: "DPDP Compliant", desc: "Full compliance with the Digital Personal Data Protection Act 2023 for student privacy." },
    { icon: Users, title: "Multi-role Portals", desc: "Dedicated interfaces for students, teachers, and principals with role-based access control." },
    { icon: Zap, title: "Automated Ingestion", desc: "Drag-and-drop Excel and PDF transcript parsing with AI-powered data extraction." },
  ];

  return (
    <section id="platform" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-50 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Platform</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Built for Modern Institutions
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
            Everything you need to transform raw academic data into actionable intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="group flex items-start gap-4 bg-gray-50/50 hover:bg-white border border-transparent hover:border-black/[0.04] rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/[0.03]"
            >
              <div className="w-11 h-11 rounded-xl bg-white border border-black/[0.04] shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <cap.icon className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{cap.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA Section ---------- */
function CTASection() {
  return (
    <section id="about" className="py-24 md:py-32 bg-[#F5F5F5]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 rounded-[2rem] p-12 md:p-20 shadow-2xl shadow-gray-900/20 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
              Transform Your
              <br />Institution Today
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 font-medium">
              Join the next generation of AI-powered student analytics. Start scoring potential, not just grades.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-bold px-8 py-4 rounded-full transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                Register Institution
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white px-8 py-4 rounded-full border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="bg-white border-t border-black/[0.04] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              OAA<span className="text-indigo-600">.ai</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
            <a href="#features" className="hover:text-gray-600 transition-colors">Features</a>
            <a href="#scoring" className="hover:text-gray-600 transition-colors">Scoring</a>
            <a href="#platform" className="hover:text-gray-600 transition-colors">Platform</a>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            DPDP Act 2023 Compliant
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-black/[0.03] text-center text-xs text-gray-400 font-medium">
          © {new Date().getFullYear()} OAA.ai — Overall Academic Analysis Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ========== MAIN PAGE ========== */
export default async function Home() {
  const session = await auth();

  // Authenticated users go straight to their dashboard
  if (session?.user) {
    const role = session.user.role;
    if (role === "student") {
      redirect("/dashboard/student");
    } else {
      redirect("/dashboard/admin");
    }
  }

  // Public-facing landing page for unauthenticated visitors
  return (
    <main className="bg-[#F5F5F5]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ScoringSection />
      <PlatformSection />
      <CTASection />
      <Footer />
    </main>
  );
}
