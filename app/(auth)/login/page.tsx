"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  Shield, 
  GraduationCap, 
  Mail, 
  Lock, 
  UserCheck,
  CheckCircle2,
  Activity,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("Invalid email or password");
        setIsLoading(false);
      } else {
        await getSession();
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login submission error:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl px-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Left Column: OAA Showcase Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col justify-between bg-gray-900 rounded-3xl p-10 relative overflow-hidden"
        >
          {/* Background accents */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <GraduationCap className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Overall Academic Analysis
                  </h1>
                  <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase mt-0.5">
                    OAA Scoring Engine
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>

            {/* Formula */}
            <div className="space-y-6 my-auto">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Composite Algorithm
                </p>
                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-4 font-mono text-sm text-indigo-300">
                  OAAScore = max(0, [0.40A + 0.30S + 0.30P] - [R × 5])
                </div>
              </div>

              {/* Pillar bars */}
              <div className="space-y-3">
                {[
                  { label: "Academic (A)", weight: "40%", value: 92, color: "indigo" },
                  { label: "Skills (S)", weight: "30%", value: 88, color: "emerald" },
                  { label: "Projects (P)", weight: "30%", value: 85, color: "amber" },
                ].map((p) => (
                  <div key={p.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-medium">{p.label}</span>
                      <span className="text-gray-300 font-semibold">{p.weight} · {p.value}/100</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          p.color === "indigo" ? "bg-indigo-500" :
                          p.color === "emerald" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${p.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom compliance */}
            <div className="border-t border-white/[0.06] pt-6 mt-8 flex items-center gap-2 text-gray-500">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">DPDP Act 2023 Compliant</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl border border-black/[0.04] p-8 md:p-10 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-2">
                Welcome back
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Sign in to access your OAA portal.
              </p>
            </div>

            {/* Error */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl mb-6 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="email">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@institution.edu"
                  disabled={isLoading}
                  {...register("email")}
                  className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
                {errors.email && (
                  <p className="text-rose-500 text-xs font-semibold mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="password">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    disabled={isLoading}
                    {...register("password")}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded-xl pl-4 pr-11 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-rose-500 text-xs font-semibold mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full group flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </motion.button>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200" />
                <span className="flex-shrink mx-4 text-gray-400 text-xs font-semibold">or</span>
                <div className="flex-grow border-t border-gray-200" />
              </div>

              {/* Google Sign In */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() => signIn("google")}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </motion.button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500 font-medium">
              New institutional deployment?{" "}
              <Link
                href="/register"
                className="text-indigo-600 hover:text-indigo-500 font-bold transition"
              >
                Register
              </Link>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="border-t border-gray-100 pt-6 mt-6">
            <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-4">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Demo Profiles</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setValue("email", "principal@demo.com", { shouldValidate: true });
                  setValue("password", "principal123", { shouldValidate: true });
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 text-gray-600 hover:text-gray-900 transition-all duration-200 cursor-pointer text-center group"
              >
                <span className="font-bold text-xs text-indigo-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Principal
                </span>
                <span className="text-[10px] text-gray-400 font-semibold select-all">principal@demo.com</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue("email", "student@demo.com", { shouldValidate: true });
                  setValue("password", "student123", { shouldValidate: true });
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-emerald-50 hover:border-emerald-100 text-gray-600 hover:text-gray-900 transition-all duration-200 cursor-pointer text-center group"
              >
                <span className="font-bold text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Student
                </span>
                <span className="text-[10px] text-gray-400 font-semibold select-all">student@demo.com</span>
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
