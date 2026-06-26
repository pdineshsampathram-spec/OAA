"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Code,
  AlertTriangle,
  Shield,
  ExternalLink,
  Brain,
  CheckCircle,
  X,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RedDotBadge from "../discipline/RedDotBadge";
import DisciplineRestrictionBanner from "../discipline/DisciplineRestrictionBanner";
import PeerChatPanel from "../chat/PeerChatPanel";

interface Skill {
  id: string;
  skillName: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced";
  verified: number;
}

interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string;
  repoUrl: string | null;
  score: number;
}

interface OaaScore {
  academicScore: number;
  skillsScore: number;
  projectScore: number;
  behaviorScore: number;
  totalOaaScore: number;
  percentileRank: number;
}

interface AiPrediction {
  id: string;
  riskFlag: number;
  score: number;
  suggestions: string; // JSON string of recommendations
  createdAt: string;
}

interface StudentDashboardViewProps {
  student: {
    id: string;
    name: string;
    class: string;
    section: string;
  };
  oaaScore: OaaScore;
  skills: Skill[];
  projects: Project[];
  prediction: AiPrediction | null;
  restriction: "none" | "flag_only" | "read_only" | "locked";
  dotCount: number;
}

export default function StudentDashboardView({
  student,
  oaaScore,
  skills,
  projects,
  prediction,
  restriction,
  dotCount,
}: StudentDashboardViewProps) {
  const router = useRouter();

  // Modals state
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Skill form state
  const [skillName, setSkillName] = useState("");
  const [proficiency, setProficiency] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);
  const [skillError, setSkillError] = useState("");

  // Project form state
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectTech, setProjectTech] = useState("");
  const [projectRepo, setProjectRepo] = useState("");
  const [projectScoreValue, setProjectScoreValue] = useState("10"); // Student self-eval
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectError, setProjectError] = useState("");

  // Circular Progress Ring Calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const score = oaaScore.totalOaaScore;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 75) return "text-emerald-500 stroke-emerald-500";
    if (val >= 50) return "text-amber-500 stroke-amber-500";
    return "text-rose-500 stroke-rose-500";
  };

  const getScoreBgColor = (val: number) => {
    if (val >= 75) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (val >= 50) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  };

  // Handle Add Skill
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;

    setIsSubmittingSkill(true);
    setSkillError("");

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName, proficiencyLevel: proficiency }),
      });
      const data = await res.json();
      if (data.error) {
        setSkillError(data.error);
      } else {
        setIsSkillModalOpen(false);
        setSkillName("");
        setProficiency("beginner");
        router.refresh(); // Triggers server component re-fetch & OAA update
      }
    } catch {
      setSkillError("Failed to add skill. Please try again.");
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  // Handle Add Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDesc.trim() || !projectTech.trim()) return;

    setIsSubmittingProject(true);
    setProjectError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDesc,
          techStack: projectTech,
          repoUrl: projectRepo || null,
          score: parseFloat(projectScoreValue) || 0,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setProjectError(data.error);
      } else {
        setIsProjectModalOpen(false);
        setProjectTitle("");
        setProjectDesc("");
        setProjectTech("");
        setProjectRepo("");
        setProjectScoreValue("10");
        router.refresh(); // Triggers server component re-fetch & OAA update
      }
    } catch {
      setProjectError("Failed to add project. Please try again.");
    } finally {
      setIsSubmittingProject(false);
    }
  };

  // Parse AI prediction recommendations
  let recommendations: string[] = [];
  if (prediction?.suggestions) {
    try {
      recommendations = JSON.parse(prediction.suggestions);
    } catch {
      recommendations = [prediction.suggestions];
    }
  }

  return (
    <div className="space-y-8 pb-32">
      {/* 1. Dashboard Banner */}
      <DisciplineRestrictionBanner restriction={restriction} />

      {/* Hero Greeting */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Welcome back, {student.name.split(" ")[0]}.
        </h1>
        <p className="text-lg text-slate-500 dark:text-zinc-400">
          Class {student.class} — Section {student.section} · Your Overall Academic Analysis dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. OAA HERO SCORE CHART CARD */}
        <div className="lg:col-span-2 backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col sm:flex-row gap-8 items-center">
          {/* Circular SVG Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-36 h-36 transform -rotate-90">
              {/* Track */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-neutral-100 dark:stroke-zinc-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Score Fill */}
              <motion.circle
                cx="72"
                cy="72"
                r={radius}
                className={cn(getScoreColor(score))}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className={cn("text-3xl font-extrabold tracking-tight", getScoreColor(score).split(" ")[0])}>
                {score.toFixed(0)}
              </span>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">OAA Score</p>
            </div>
          </div>

          {/* Pillar breakdown */}
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-md">Pillars Breakdown</h3>
                <p className="text-[10px] text-slate-400">Weighted composition scores</p>
              </div>
              <span className={cn("text-xs font-bold px-3 py-1 rounded-full border", getScoreBgColor(score))}>
                Top {((100 - oaaScore.percentileRank)).toFixed(0)}% in Class
              </span>
            </div>

            <div className="space-y-3">
              {/* Academic (40) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">Academic Score</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{oaaScore.academicScore} / 40</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(oaaScore.academicScore / 40) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Skills (30) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">Skills Score</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{oaaScore.skillsScore} / 30</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(oaaScore.skillsScore / 30) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Projects (20) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">Projects Score</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{oaaScore.projectScore} / 20</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-pink-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(oaaScore.projectScore / 20) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Behavior (10) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">Behavior Score</span>
                  <span className={cn("font-extrabold", oaaScore.behaviorScore < 6 ? "text-rose-500" : "text-slate-850 dark:text-white")}>
                    {oaaScore.behaviorScore} / 10
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", oaaScore.behaviorScore < 6 ? "bg-rose-500" : "bg-amber-500")}
                    initial={{ width: 0 }}
                    animate={{ width: `${(oaaScore.behaviorScore / 10) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DISCIPLINE SUMMARY CARD */}
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
              <h3 className="font-bold text-slate-800 dark:text-white text-md flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Discipline Status
              </h3>
            </div>

            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <RedDotBadge dotCount={dotCount} size="md" />

              {dotCount === 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
                  <CheckCircle className="w-4 h-4" />
                  Clean Record ✓
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-xs font-extrabold text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/20 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  {dotCount} Red Dot{dotCount > 1 ? "s" : ""} Active
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-zinc-500 text-center leading-normal">
            Portal restrictions auto-apply at 3 dots (Read-Only) and 5 dots (Account Locked). Keep your record clean!
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. SKILLS SECTION */}
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
              <h3 className="font-bold text-slate-800 dark:text-white text-md flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-500" />
                Technical & Soft Skills
              </h3>
              {restriction !== "locked" && (
                <button
                  onClick={() => setIsSkillModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <PlusCircle className="w-4 h-4" /> Add Skill
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {skills.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 w-full">
                  No skills logged yet. Add skills to boost your OAA score.
                </div>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] shadow-sm text-xs font-bold"
                  >
                    <span>{skill.skillName}</span>
                    <span className="opacity-50 font-normal">({skill.proficiencyLevel})</span>
                    {skill.verified === 1 && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="Verified Skill" />
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4">
            * Skills contribute up to 30% of your total OAA score. Intermediate adds 4 pts, Advanced adds 6 pts (capped at 30).
          </div>
        </div>

        {/* 5. PROJECTS SECTION */}
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-black/5 dark:border-white/5">
              <h3 className="font-bold text-slate-800 dark:text-white text-md flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Project Submissions
              </h3>
              {restriction !== "locked" && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <PlusCircle className="w-4 h-4" /> Add Project
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 w-full">
                  No projects submitted yet. Add projects to boost your OAA score.
                </div>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 bg-white dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] rounded-xl flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-850 dark:text-white">{proj.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-[250px] truncate">
                        {proj.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {proj.techStack.split(",").map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 dark:bg-black/20 text-slate-500 rounded border border-black/[0.02] dark:border-white/[0.02]"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-pink-500">{proj.score} / 20</span>
                      {proj.repoUrl && (
                        <a
                          href={proj.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-end gap-0.5 text-[9px] text-slate-400 hover:text-indigo-500 mt-1"
                        >
                          Repo <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4">
            * Projects contribute up to 20% of your OAA score. Average project score determines the pillar valuation.
          </div>
        </div>
      </div>

      {/* 6. AI RISK INSIGHTS CARD */}
      {prediction && (
        <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1d1d1f]/70 border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
            <h3 className="font-bold text-slate-800 dark:text-white text-md flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              AI Risk Insights & Interventions
            </h3>
            <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold px-2 py-0.5 rounded">
              Computed: {new Date(prediction.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Risk Flag Progress */}
            {(() => {
              const scoreVal = prediction.score > 1 ? prediction.score / 100 : prediction.score;
              const scorePct = Math.round(scoreVal * 100);
              return (
                <div className="shrink-0 w-full md:w-48 text-center space-y-2 border-r border-black/5 dark:border-zinc-800 pr-0 md:pr-8">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Risk Score</span>
                  <div className="text-5xl font-black text-slate-800 dark:text-white">
                    {scorePct}%
                  </div>
                  <div className="pt-2">
                    {prediction.riskFlag === 1 ? (
                      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs animate-pulse">
                        High Academic Risk
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                        Low Risk (All Clear)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Recommendations List */}
            <div className="flex-1 space-y-3 w-full">
              <h4 className="text-xs font-extrabold text-slate-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-purple-500" /> Recommended Action Items
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recommendations.map((suggestion, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-4 bg-white dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500" />
                    <p className="text-xs text-slate-700 dark:text-zinc-200 font-medium leading-relaxed">
                      {suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. PEER CHAT PANEL */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Peer Collaboration Chat
          </h2>
        </div>
        <PeerChatPanel />
      </div>

      {/* ADD SKILL MODAL */}
      <AnimatePresence>
        {isSkillModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSkillModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-black/[0.04] bg-white p-6 shadow-2xl dark:border-white/[0.04] dark:bg-[#1c1c1e] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] pb-3 dark:border-white/[0.04]">
                <h3 className="text-md font-bold text-slate-805 dark:text-white">Add New Skill</h3>
                <button
                  onClick={() => setIsSkillModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {skillError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold">
                  {skillError}
                </div>
              )}

              <form onSubmit={handleAddSkill} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Skill Name</label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g. Next.js, Python, Public Speaking"
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Proficiency Level</label>
                  <select
                    value={proficiency}
                    onChange={(e) => setProficiency(e.target.value as "beginner" | "intermediate" | "advanced")}
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSkillModalOpen(false)}
                    className="flex-1 rounded-xl border border-black/[0.06] py-2.5 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/[0.06] dark:text-zinc-400 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSkill || !skillName.trim()}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 disabled:opacity-50"
                  >
                    {isSubmittingSkill ? "Adding..." : "Add Skill"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD PROJECT MODAL */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-black/[0.04] bg-white p-6 shadow-2xl dark:border-white/[0.04] dark:bg-[#1c1c1e] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] pb-3 dark:border-white/[0.04]">
                <h3 className="text-md font-bold text-slate-805 dark:text-white">Add New Project</h3>
                <button
                  onClick={() => setIsProjectModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {projectError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold">
                  {projectError}
                </div>
              )}

              <form onSubmit={handleAddProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Project Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g. Chat Application, E-commerce Portal"
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Description</label>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Brief description of project goals and scope..."
                    rows={2}
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Tech Stack</label>
                  <input
                    type="text"
                    value={projectTech}
                    onChange={(e) => setProjectTech(e.target.value)}
                    placeholder="e.g. React, Next.js, Node.js (comma separated)"
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Repository URL (Optional)</label>
                  <input
                    type="url"
                    value={projectRepo}
                    onChange={(e) => setProjectRepo(e.target.value)}
                    placeholder="e.g. https://github.com/username/project"
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Self-Evaluation Score (0 - 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={projectScoreValue}
                    onChange={(e) => setProjectScoreValue(e.target.value)}
                    className="w-full rounded-xl border border-black/[0.06] bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-white/[0.06] dark:bg-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProjectModalOpen(false)}
                    className="flex-1 rounded-xl border border-black/[0.06] py-2.5 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/[0.06] dark:text-zinc-400 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProject || !projectTitle.trim() || !projectDesc.trim() || !projectTech.trim()}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 disabled:opacity-50"
                  >
                    {isSubmittingProject ? "Submitting..." : "Add Project"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
