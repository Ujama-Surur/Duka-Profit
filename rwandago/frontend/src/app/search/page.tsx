"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, ShieldCheck, Filter, ArrowRight, DollarSign } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  type: "DESTINATION" | "ATTRACTION" | "ACTIVITY" | "HOTEL";
  location: string;
  description: string;
  price?: string;
  image: string;
  slug: string;
  isVerified: boolean;
}

const ALL_SEARCH_DATA: SearchResult[] = [
  {
    id: "s-1",
    name: "Musanze & Volcanoes",
    type: "DESTINATION",
    location: "Northern Province",
    description: "Sanctuary of the endangered mountain gorillas and majestic mist-wrapped volcanic peaks.",
    image: "https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=800&q=80",
    slug: "/destinations/musanze",
    isVerified: true,
  },
  {
    id: "s-2",
    name: "Volcanoes National Park Gorilla Sanctuary",
    type: "ATTRACTION",
    location: "Kinigi, Musanze",
    description: "Home of mountain gorillas and golden monkeys. Guided expeditions through bamboo forests.",
    price: "$1,500 / permit",
    image: "https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=800&q=80",
    slug: "/attractions/volcanoes-national-park",
    isVerified: true,
  },
  {
    id: "s-3",
    name: "Kigali City Discovery",
    type: "DESTINATION",
    location: "Kigali Province",
    description: "Cleanest capital in Africa, renowned for culinary artistry, fashion, and vibrant hills.",
    image: "https://images.unsplash.com/photo-1609198092458-38a293c7ac4b?auto=format&fit=crop&w=800&q=80",
    slug: "/destinations/kigali",
    isVerified: true,
  },
  {
    id: "s-4",
    name: "Kigali Genocide Memorial",
    type: "ATTRACTION",
    location: "Gisozi, Kigali",
    description: "A profound memorial and peace education center honoring the 1994 victims.",
    price: "Free Admission",
    image: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80",
    slug: "/attractions/kigali-genocide-memorial",
    isVerified: true,
  },
  {
    id: "s-5",
    name: "Rubavu & Lake Kivu Beaches",
    type: "DESTINATION",
    location: "Western Province",
    description: "Sandy lakeshore resort paradise with fresh tilapia, kayaking, and tranquil breezes.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    slug: "/destinations/rubavu",
    isVerified: true,
  },
  {
    id: "s-6",
    name: "Akagera Big Five Safari",
    type: "ATTRACTION",
    location: "Kayonza, Eastern Province",
    description: "Expansive savanna wetlands featuring lions, black and white rhinos, and boat safaris.",
    price: "$140 / person",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80",
    slug: "/attractions/akagera-safari",
    isVerified: true,
  },
  {
    id: "s-7",
    name: "Nyungwe 70m Canopy Walkway",
    type: "ATTRACTION",
    location: "Nyungwe National Park",
    description: "High-adrenaline suspended walkway swaying 70 meters above primeval rainforest canopy.",
    price: "$40 / person",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    slug: "/attractions/nyungwe-canopy-walkway",
    isVerified: true,
  },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredResults = ALL_SEARCH_DATA.filter((item) => {
    const matchesQuery =
      query.trim() === "" ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.location.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase());

    const matchesFilter = filterType === "ALL" || item.type === filterType;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Search Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Find Places, Activities & Stays in Rwanda
        </h1>
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city, national park, gorilla trekking, hotel, safari..."
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-rwanda-green"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 text-xs font-bold">
          {["ALL", "DESTINATION", "ATTRACTION", "ACTIVITY", "HOTEL"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl border transition-all flex-shrink-0 ${
                filterType === type
                  ? "border-rwanda-green bg-emerald-50 text-rwanda-green shadow-sm"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {type === "ALL" ? "All Categories" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-gray-500">
        <span>Showing {filteredResults.length} results</span>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResults.map((result) => (
          <Link
            key={result.id}
            href={result.slug}
            className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1"
          >
            <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
              <img
                src={result.image}
                alt={result.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-gray-900">
                {result.type}
              </div>
              {result.isVerified && (
                <div className="absolute top-3 right-3 bg-emerald-700/90 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-rwanda-green" />
                  <span>{result.location}</span>
                </div>
                <h3 className="text-lg font-black text-gray-900 group-hover:text-rwanda-green transition-colors leading-snug">
                  {result.name}
                </h3>
                <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                  {result.description}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-black text-gray-900">
                  {result.price || "Explore Details"}
                </span>
                <span className="text-xs font-bold text-rwanda-green flex items-center gap-1">
                  View <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center font-bold text-gray-400">Loading search explorer...</div>}>
      <SearchContent />
    </Suspense>
  );
}

