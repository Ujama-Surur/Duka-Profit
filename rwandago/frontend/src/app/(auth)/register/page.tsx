"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, AlertCircle } from "lucide-react";
import { authService } from "../../../services/authService";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("Rwanda");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authService.register({
        email,
        password,
        firstName,
        lastName,
        country,
        phone,
        role,
      });

      if (res.success) {
        if (role === "BUSINESS_OWNER") {
          router.push("/business/dashboard");
        } else {
          router.push("/profile");
        }
      } else {
        setError(res.error?.message || "Registration failed. Please check your information.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-rwanda-green mx-auto flex items-center justify-center font-bold text-2xl">
            🇷🇼
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Create your RwandaGo Account
          </h1>
          <p className="text-xs text-gray-500">
            Join the platform to plan trips, save favorites, or list your tourism business
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Kwizera"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Gael"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Rwanda"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 788 000 000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:border-rwanda-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              I am registering as:
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className={`p-3 rounded-xl border cursor-pointer text-center font-bold transition-colors ${role === "USER" ? "border-rwanda-green bg-emerald-50/50 text-rwanda-green" : "border-gray-200 text-gray-600"}`}>
                <input
                  type="radio"
                  name="role"
                  value="USER"
                  checked={role === "USER"}
                  onChange={() => setRole("USER")}
                  className="hidden"
                />
                Traveler
              </label>
              <label className={`p-3 rounded-xl border cursor-pointer text-center font-bold transition-colors ${role === "BUSINESS_OWNER" ? "border-rwanda-green bg-emerald-50/50 text-rwanda-green" : "border-gray-200 text-gray-600"}`}>
                <input
                  type="radio"
                  name="role"
                  value="BUSINESS_OWNER"
                  checked={role === "BUSINESS_OWNER"}
                  onChange={() => setRole("BUSINESS_OWNER")}
                  className="hidden"
                />
                Business Owner
              </label>
              <label className={`p-3 rounded-xl border cursor-pointer text-center font-bold transition-colors ${role === "TOUR_GUIDE" ? "border-rwanda-green bg-emerald-50/50 text-rwanda-green" : "border-gray-200 text-gray-600"}`}>
                <input
                  type="radio"
                  name="role"
                  value="TOUR_GUIDE"
                  checked={role === "TOUR_GUIDE"}
                  onChange={() => setRole("TOUR_GUIDE")}
                  className="hidden"
                />
                Tour Guide
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-rwanda-green hover:bg-rwanda-green-dark text-white font-extrabold text-sm rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-rwanda-green hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
