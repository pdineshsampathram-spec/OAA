"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";

import { 
  User, 
  School, 
  Bell, 
  Lock, 
  Save, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { updateProfileAction, updateSchoolAction, updateNotificationPreferencesAction } from "@/lib/actions/settings";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/Toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useSession } from "next-auth/react";

// Zod schemas
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const schoolSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
});

interface SettingsPageProps {
  initialUser: {
    name: string;
    email: string;
    role: "admin" | "teacher" | "principal" | "student";
  };
  initialSchoolName: string;
  initialEmailAlerts: boolean;
}

export default function SettingsPage({
  initialUser,
  initialSchoolName,
  initialEmailAlerts,
}: SettingsPageProps) {
  const { update } = useSession();
  const [toast, setToast] = useState<{ open: boolean; variant: "success" | "error"; description: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "school" | "notifications">("profile");

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingSchool, setIsUpdatingSchool] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // Notifications State
  const [emailAlerts, setEmailAlerts] = useState(initialEmailAlerts);

  const showToast = (variant: "success" | "error", description: string) => {
    setToast({ open: true, variant, description });
  };

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialUser.name,
      email: initialUser.email,
      password: "",
      confirmPassword: "",
    },
  });

  // School Form
  const {
    register: registerSchool,
    handleSubmit: handleSchoolSubmit,
    formState: { errors: schoolErrors },
  } = useForm<z.infer<typeof schoolSchema>>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      schoolName: initialSchoolName,
    },
  });

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsUpdatingProfile(true);
    try {
      const res = await updateProfileAction(null, {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (res.success) {
        showToast("success", res.message || "Profile successfully updated.");
        await update({ name: data.name, email: data.email });
        resetProfile({
          name: data.name,
          email: data.email,
          password: "",
          confirmPassword: "",
        });
      } else {
        showToast("error", res.error || "Failed to update profile.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred.";
      showToast("error", errMsg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onSchoolSubmit = async (data: z.infer<typeof schoolSchema>) => {
    setIsUpdatingSchool(true);
    try {
      const res = await updateSchoolAction(null, data);
      if (res.success) {
        showToast("success", res.message || "School details successfully saved.");
      } else {
        showToast("error", res.error || "Failed to save school name.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred.";
      showToast("error", errMsg);
    } finally {
      setIsUpdatingSchool(false);
    }
  };

  const handleToggleNotifications = async (checked: boolean) => {
    setEmailAlerts(checked);
    setIsUpdatingNotifications(true);
    try {
      const res = await updateNotificationPreferencesAction(checked);
      if (res.success) {
        showToast("success", "Preferences saved.");
      } else {
        showToast("error", res.error || "Failed to update alerts.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred.";
      showToast("error", errMsg);
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const tabs = [
    { id: "profile", label: "User Profile", icon: User },
    { id: "school", label: "School Setup", icon: School, adminOnly: true },
    { id: "notifications", label: "Alert Configs", icon: Bell },
  ];

  const filteredTabs = tabs.filter(t => !t.adminOnly || initialUser.role === "admin");

  return (
    <ToastProvider>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 min-h-[calc(100vh-80px)]"
      >
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">System Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your personal profile, credentials, organization details, and email notification parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Tabs Sidebar */}
          <div className="flex flex-row md:flex-col bg-white border border-slate-100 p-2 rounded-2xl shadow-sm md:space-y-1 overflow-x-auto gap-2 md:gap-0">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "profile" | "school" | "notifications")}

                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap md:w-full transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content container */}
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              {/* Profile Panel */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-500" />
                      <span>User Profile Settings</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Update your account name, contact email, or update your password hash.
                    </p>
                  </div>

                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          {...registerProfile("name")}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {profileErrors.name && (
                          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{profileErrors.name.message}</span>
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                        <input
                          type="email"
                          {...registerProfile("email")}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {profileErrors.email && (
                          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{profileErrors.email.message}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-2">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Update Security Credentials (Optional)</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                          <input
                            type="password"
                            placeholder="Leave blank to keep current"
                            {...registerProfile("password")}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                          <input
                            type="password"
                            placeholder="Leave blank to keep current"
                            {...registerProfile("confirmPassword")}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          {profileErrors.confirmPassword && (
                            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{profileErrors.confirmPassword.message}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition disabled:opacity-50"
                    >
                      {isUpdatingProfile ? (
                        <LoadingSpinner size="sm" color="border-white" />
                      ) : (
                        <Save className="w-4.5 h-4.5" />
                      )}
                      <span>Save Profile Modifications</span>
                    </button>
                  </form>
                </motion.div>
              )}

              {/* School Panel */}
              {activeTab === "school" && initialUser.role === "admin" && (
                <motion.div
                  key="school"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <School className="w-5 h-5 text-indigo-500" />
                      <span>School Setup & Branding</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure your school branding name. This is displayed on printable report cards and performance summary PDFs.
                    </p>
                  </div>

                  <form onSubmit={handleSchoolSubmit(onSchoolSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered School Name</label>
                      <input
                        type="text"
                        {...registerSchool("schoolName")}
                        className="w-full max-w-xl px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      {schoolErrors.schoolName && (
                        <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{schoolErrors.schoolName.message}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingSchool}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition disabled:opacity-50"
                    >
                      {isUpdatingSchool ? (
                        <LoadingSpinner size="sm" color="border-white" />
                      ) : (
                        <Save className="w-4.5 h-4.5" />
                      )}
                      <span>Save Organization Setup</span>
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Notifications Panel */}
              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-indigo-500" />
                      <span>Alert & Notification Settings</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure your communication alerts channel. Choose when to trigger email alerts for student performance warnings.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-700">At-Risk Student Alerts</h4>
                        <p className="text-xs text-slate-400 max-w-md">
                          Trigger instantaneous notification alerts when a student drops below a 75% attendance rate or is predicted at high-risk by the AI model.
                        </p>
                      </div>

                      {/* Custom Toggle Switch */}
                      <button
                        onClick={() => handleToggleNotifications(!emailAlerts)}
                        disabled={isUpdatingNotifications}
                        className={`w-12 h-6.5 rounded-full flex p-1 transition-all focus:outline-none ${
                          emailAlerts ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-4.5 h-4.5 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 leading-normal bg-indigo-50/30 border border-indigo-100/30 p-4.5 rounded-2xl">
                      <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span>
                        Preferences are saved in user session configs. Email routing handles automatic triggers based on batch evaluations.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Custom Toast Render */}
        {toast && (
          <Toast
            open={toast.open}
            onOpenChange={(open) => setToast(open ? toast : null)}
            variant={toast.variant}
            description={toast.description}
          />
        )}
        <ToastViewport />
      </motion.div>
    </ToastProvider>
  );
}
