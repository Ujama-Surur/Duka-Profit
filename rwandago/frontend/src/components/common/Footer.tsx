import React from "react";
import Link from "next/link";
import { ShieldCheck, Heart, Mail, Phone, MapPin } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rwanda-green flex items-center justify-center text-white font-bold text-2xl shadow">
                🇷🇼
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                Rwanda<span className="text-rwanda-green-light">Go</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Rwanda&apos;s definitive travel discovery and trip-planning platform. Helping travelers explore majestic hills, encounter mountain gorillas, and experience authentic Rwandan hospitality.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Official Verification & Trust Architecture
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/destinations/kigali" className="hover:text-white transition-colors">
                  Kigali City
                </Link>
              </li>
              <li>
                <Link href="/destinations/musanze" className="hover:text-white transition-colors">
                  Volcanoes & Gorillas
                </Link>
              </li>
              <li>
                <Link href="/destinations/rubavu" className="hover:text-white transition-colors">
                  Lake Kivu Shoreline
                </Link>
              </li>
              <li>
                <Link href="/destinations/akagera" className="hover:text-white transition-colors">
                  Akagera Savanna Safari
                </Link>
              </li>
              <li>
                <Link href="/destinations/nyungwe" className="hover:text-white transition-colors">
                  Nyungwe Canopy Walk
                </Link>
              </li>
            </ul>
          </div>

          {/* Planning Tools */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              Trip Planning
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/trip-planner" className="hover:text-white transition-colors">
                  Itinerary Builder
                </Link>
              </li>
              <li>
                <Link href="/budget" className="hover:text-white transition-colors">
                  Budget Calculator
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white transition-colors">
                  Interactive Tourism Map
                </Link>
              </li>
              <li>
                <Link href="/business" className="hover:text-white transition-colors">
                  Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-white transition-colors">
                  Admin Verification Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              Trust & Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/legal/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/verification" className="hover:text-white transition-colors">
                  Verification Standards
                </Link>
              </li>
              <li>
                <Link href="/legal/reviews" className="hover:text-white transition-colors">
                  Review Authenticity Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} RwandaGo Platform. Designed with passion for Rwanda 🇷🇼.</p>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Discover Rwanda. Your way.</span>
            <span>•</span>
            <span className="text-emerald-400">Stay. Explore. Experience Rwanda.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
