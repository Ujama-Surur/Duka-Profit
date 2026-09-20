"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService } from "../../../services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authService.login({ email, password });
      if (res.success) {
        if (res.data?.user?.roles?.includes("ROLE_ADMIN")) {
          router.push("/admin/dashboard");
        } else if (res.data?.user?.roles?.includes("ROLE_BUSINESS_OWNER")) {
          router.push("/business/dashboard");
        } else {
          router.push("/profile");
        }
      } else {
        setError(res.error?.message || "Invalid email or password");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role: "admin" | "partner" | "traveler") => {
    if (role === "admin") {
      setEmail("admin@rwandago.rw");
      setPassword("AdminRwandaGo2026!");
    } else if (role === "partner") {
      setEmail("partner@rwandago.rw");
      setPassword("PartnerRwandaGo2026!");
    } else {
      setEmail("traveler@rwandago.rw");
      setPassword("TravelerRwandaGo2026!");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-rwanda-green mx-auto flex items-center justify-center font-bold text-2xl">
            🇷🇼
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Sign In to RwandaGo
          </h1>
          <p className="text-xs text-gray-500">
            Access your trips, saved favorites, bookings, and verified partner dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Demo Shortcuts */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2">
          <span className="text-[11px] uppercase font-bold text-gray-400 block text-center">
            Demo Account Autofill
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => fillDemoCredentials("traveler")}
              className="py-1 px-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-center"
            >
              Traveler
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials("partner")}
              className="py-1 px-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-center"
            >
              Partner
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials("admin")}
              className="py-1 px-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-amber-700 text-center font-bold"
            >
              Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. traveler@rwandago.rw"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                Password
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-rwanda-green hover:bg-rwanda-green-dark text-white font-extrabold text-sm rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-bold text-rwanda-green hover:underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}
