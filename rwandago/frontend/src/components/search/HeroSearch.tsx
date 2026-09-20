"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Users, Sparkles } from "lucide-react";

export const HeroSearch: React.FC = () => {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [travelers, setTravelers] = useState("2 Travelers");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = destination.trim() ? `?q=${encodeURIComponent(destination.trim())}` : "";
    router.push(`/search${query}`);
  };

  const quickFilters = [
    { label: "🦍 Gorilla Trekking", query: "gorilla" },
    { label: "🌊 Lake Kivu", query: "kivu" },
    { label: "🦁 Big Five Safari", query: "safari" },
    { label: "🏛️ Kigali Culture", query: "kigali" },
    { label: "🌿 Canopy Walk", query: "nyungwe" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Bar Container */}
      <form
        onSubmit={handleSearch}
        className="bg-white p-3 sm:p-4 rounded-3xl shadow-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
      >
        {/* Destination Input */}
        <div className="md:col-span-5 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors">
          <MapPin className="w-5 h-5 text-rwanda-green flex-shrink-0" />
          <div className="w-full">
            <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider">
              Where to?
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Musanze, Kigali, Lake Kivu..."
              className="w-full bg-transparent text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="md:col-span-3 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors">
          <Calendar className="w-5 h-5 text-rwanda-blue flex-shrink-0" />
          <div>
            <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider">
              When
            </label>
            <span className="text-sm font-semibold text-gray-800">Flexible Dates</span>
          </div>
        </div>

        {/* Travelers */}
        <div className="md:col-span-2 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors">
          <Users className="w-5 h-5 text-rwanda-yellow flex-shrink-0" />
          <div>
            <label className="block text-[11px] uppercase font-bold text-gray-400 tracking-wider">
              Guests
            </label>
            <select
              value={travelers}
              onChange={(e) => setTravelers(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="1 Traveler">1 Solo</option>
              <option value="2 Travelers">2 Couple</option>
              <option value="4 Travelers">4 Family</option>
              <option value="6+ Travelers">Group</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full h-14 bg-rwanda-green hover:bg-rwanda-green-dark text-white font-bold text-sm rounded-2xl shadow-lg shadow-rwanda-green/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* Quick Filters */}
      <div className="mt-4 flex items-center gap-2 flex-wrap justify-center text-xs font-semibold text-white/90">
        <span className="text-white/70">Trending:</span>
        {quickFilters.map((q) => (
          <button
            key={q.query}
            onClick={() => router.push(`/search?q=${q.query}`)}
            className="bg-white/15 hover:bg-white/30 backdrop-blur-md px-3.5 py-1.5 rounded-full transition-colors border border-white/20"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
};
