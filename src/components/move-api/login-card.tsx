"use client";

import React, { useState } from "react";
import { Lock, User, Key, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

interface LoginCardProps {
  onSuccess: (username: string) => void;
}

export function LoginCard({ onSuccess }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.user?.username || username);
      } else {
        setError(data.error || "بيانات الدخول غير صحيحة");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefault = () => {
    setUsername("admin");
    setPassword("admin123");
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#090a0f] text-white relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#12141c]/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            MOVE API
          </h1>
          <p className="text-sm text-neutral-400">
            لوحة تحكم خادم البث وواجهات برمجة التطبيقات (VOD API)
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
              اسم المستخدم (Username)
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                dir="ltr"
                required
                className="w-full bg-[#1a1d28] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-left"
              />
              <User className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 text-right">
              كلمة المرور (Password)
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                required
                className="w-full bg-[#1a1d28] border border-white/10 rounded-xl px-4 py-3 pl-11 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-left"
              />
              <Key className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>دخول إلى لوحة الـ API</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Railway Tip Box */}
        <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-neutral-400 bg-white/[0.03] p-3 rounded-xl border border-white/5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-neutral-200">متغيرات ريلوي (Railway):</span>
              <p className="mt-0.5">
                يمكنك تخصيص بيانات الدخول من لوحة Railway في تبويب <code className="text-cyan-300 font-mono">Variables</code> عبر:
                <br />
                <code className="text-cyan-300 font-mono">ADMIN_USERNAME</code> و <code className="text-cyan-300 font-mono">ADMIN_PASSWORD</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFillDefault}
            className="w-full text-center text-xs text-neutral-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1.5 py-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>تجربة الدخول الافتراضي (admin / admin123)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
