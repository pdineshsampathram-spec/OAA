"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Shield, User, Mail, School, KeyRound, ArrowRight } from "lucide-react";
import Link from "next/link";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["admin", "teacher", "principal"]),
    schoolName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "teacher",
      schoolName: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          schoolName: values.schoolName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setIsLoading(false);
      } else {
        setSuccessMsg("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Registration submission error:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const inputClasses = "w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-lg"
    >
      <div className="bg-white rounded-3xl border border-black/[0.04] p-8 md:p-10 shadow-sm">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-2">
            Create Account
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            Register to set up your institution&apos;s analytics dashboard.
          </p>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl mb-5 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-xl mb-5 text-sm"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="name">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              disabled={isLoading}
              {...register("name")}
              className={inputClasses}
            />
            {errors.name && (
              <p className="text-rose-500 text-xs font-semibold mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="email">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@school.com"
              disabled={isLoading}
              {...register("email")}
              className={inputClasses}
            />
            {errors.email && (
              <p className="text-rose-500 text-xs font-semibold mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="password">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  disabled={isLoading}
                  {...register("password")}
                  className={`${inputClasses} pr-10`}
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="confirmPassword">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                Confirm
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  disabled={isLoading}
                  {...register("confirmPassword")}
                  className={`${inputClasses} pr-10`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-rose-500 text-xs font-semibold mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="role">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                Role
              </label>
              <select
                id="role"
                disabled={isLoading}
                {...register("role")}
                className={`${inputClasses} appearance-none cursor-pointer`}
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgb(156, 163, 175)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "1.25em",
                }}
              >
                <option value="teacher">Teacher</option>
                <option value="principal">Principal</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && (
                <p className="text-rose-500 text-xs font-semibold mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* School Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5" htmlFor="schoolName">
                <School className="w-3.5 h-3.5 text-indigo-500" />
                School Name
              </label>
              <input
                id="schoolName"
                type="text"
                placeholder="e.g., Demo High School"
                disabled={isLoading}
                {...register("schoolName")}
                className={inputClasses}
              />
              {errors.schoolName && (
                <p className="text-rose-500 text-xs font-semibold mt-1">{errors.schoolName.message}</p>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className="w-full group flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10 cursor-pointer mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 font-medium">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-indigo-600 hover:text-indigo-500 font-bold transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
