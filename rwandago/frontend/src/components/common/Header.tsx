"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, Compass, Calendar, Sparkles, Menu, X, LogOut, ShieldCheck, DollarSign } from "lucide-react";
import { authService } from "../../services/authService";
import { User as UserType } from "../../types";

export const Header: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rwanda-green to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-md group-hover:scale-105 transition-transform">
              🇷🇼
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-gray-900">
                Rwanda<span className="text-rwanda-green">Go</span>
              </span>
              <span className="block text-[10px] tracking-wider uppercase font-semibold text-rwanda-green-light">
                Discover Rwanda
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/destinations"
              className="text-sm font-medium text-gray-700 hover:text-rwanda-green transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-rwanda-green" />
              Destinations
            </Link>
            <Link
              href="/attractions"
              className="text-sm font-medium text-gray-700 hover:text-rwanda-green transition-colors"
            >
              Attractions
            </Link>
            <Link
              href="/activities"
              className="text-sm font-medium text-gray-700 hover:text-rwanda-green transition-colors"
            >
              Activities
            </Link>
            <Link
              href="/accommodations"
              className="text-sm font-medium text-gray-700 hover:text-rwanda-green transition-colors"
            >
              Stays & Lodges
            </Link>
            <Link
              href="/trip-planner"
              className="text-sm font-medium text-gray-700 hover:text-rwanda-green transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-rwanda-blue" />
              Trip Planner
            </Link>
            <Link
              href="/budget"
              className="text-sm font-medium text-gray-700 hover:text-rwanda-green transition-colors flex items-center gap-1"
            >
              <DollarSign className="w-4 h-4 text-rwanda-yellow" />
              Budget
            </Link>
          </nav>

          {/* Right Controls: Currency & Auth */}
          <div className="hidden md:flex items-center gap-4">
            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-rwanda-green"
            >
              <option value="USD">USD ($)</option>
              <option value="RWF">RWF (FRw)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 py-1.5 px-3 rounded-full border border-gray-200"
                >
                  <div className="w-7 h-7 rounded-full bg-rwanda-green text-white flex items-center justify-center text-xs">
                    {user.firstName ? user.firstName[0] : "U"}
                  </div>
                  <span>{user.firstName}</span>
                </Link>
                {user.roles.includes("ROLE_ADMIN") && (
                  <Link
                    href="/admin/dashboard"
                    className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1"
                    title="Admin Desk"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-gray-700 hover:text-rwanda-green px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-rwanda-green hover:bg-rwanda-green-dark px-4 py-2 rounded-xl shadow-sm transition-all hover:shadow"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/destinations"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-gray-700 hover:text-rwanda-green"
          >
            Destinations
          </Link>
          <Link
            href="/attractions"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-gray-700 hover:text-rwanda-green"
          >
            Attractions
          </Link>
          <Link
            href="/activities"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-gray-700 hover:text-rwanda-green"
          >
            Activities & Tours
          </Link>
          <Link
            href="/accommodations"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-gray-700 hover:text-rwanda-green"
          >
            Hotels & Lodges
          </Link>
          <Link
            href="/trip-planner"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-gray-700 hover:text-rwanda-green"
          >
            Trip Planner
          </Link>
          <Link
            href="/budget"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-gray-700 hover:text-rwanda-green"
          >
            Budget Calculator
          </Link>
          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left py-2 text-red-600 font-semibold flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user.firstName})
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 text-sm font-semibold text-gray-800 bg-gray-100 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 text-sm font-semibold text-white bg-rwanda-green rounded-lg shadow-sm"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
