import React from "react";
import Link from "next/link";
import { Compass, ShieldCheck, Calendar, Sparkles, MapPin, ArrowRight, Award, CheckCircle2 } from "lucide-react";
import { HeroSearch } from "../components/search/HeroSearch";
import { DestinationCard } from "../components/cards/DestinationCard";
import { destinationService } from "../services/destinationService";

export default async function HomePage() {
  const featuredDestinations = await destinationService.getFeatured();

  const curatedExperiences = [
    {
      title: "Mountain Gorilla Trekking",
      category: "WILDLIFE EXPEDITION",
      location: "Volcanoes National Park",
      price: "$1,500 / permit",
      duration: "Full Day",
      image: "https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=800&q=80",
      rating: 5.0,
    },
    {
      title: "Akagera Savanna Boat & Game Safari",
      category: "BIG FIVE SAFARI",
      location: "Akagera National Park",
      price: "$140 / person",
      duration: "8 Hours",
      image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80",
      rating: 4.9,
    },
    {
      title: "Nyungwe 70m Canopy Suspended Walk",
      category: "NATURE & ADVENTURE",
      location: "Nyungwe Montane Forest",
      price: "$40 / person",
      duration: "3 Hours",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
      rating: 4.8,
    },
    {
      title: "Lake Kivu Sunset Kayaking & Islands",
      category: "WATER ACTIVITY",
      location: "Rubavu / Gisenyi Shore",
      price: "$30 / person",
      duration: "2 Hours",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      rating: 4.9,
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=2000&q=85"
            alt="Rwanda landscape and misty volcanoes"
            className="w-full h-full object-cover opacity-45 scale-105 animate-pulse-slow"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 pt-12 pb-16">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-xs font-bold text-rwanda-yellow uppercase tracking-widest shadow-lg">
            <span>🇷🇼 Welcome to the Land of a Thousand Hills</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
            Discover Rwanda. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-rwanda-yellow">
              Your way.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-200 font-normal leading-relaxed">
            Plan your stay. Discover amazing places. Encounter wildlife. Calculate budgets and experience the authentic warmth of Rwanda.
          </p>

          {/* Search Interface */}
          <HeroSearch />
        </div>
      </section>

      {/* 2. Popular Destinations Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-rwanda-green block mb-1">
              Iconic Regions & Cities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Popular Destinations
            </h2>
          </div>
          <Link
            href="/destinations"
            className="text-rwanda-green font-bold text-sm hover:text-rwanda-green-dark flex items-center gap-1.5 transition-colors"
          >
            <span>View all destinations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredDestinations.slice(0, 6).map((dest) => (
            <DestinationCard key={dest.id} destination={dest} />
          ))}
        </div>
      </section>

      {/* 3. Handcrafted Experiences Section */}
      <section className="bg-[#F4EFEA] py-20 border-y border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-rwanda-clay block mb-1">
                Adventures & Wonders
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Top Experiences & Activities
              </h2>
            </div>
            <Link
              href="/activities"
              className="text-rwanda-green font-bold text-sm hover:text-rwanda-green-dark flex items-center gap-1.5"
            >
              <span>Explore all experiences</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {curatedExperiences.map((exp, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col group"
              >
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img
                    src={exp.image}
                    alt={exp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase text-gray-800">
                    {exp.category}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-xs font-bold text-rwanda-yellow flex items-center gap-1">
                    ★ {exp.rating}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 mb-1">
                      <MapPin className="w-3 h-3 text-rwanda-green" />
                      <span>{exp.location}</span>
                    </div>
                    <h4 className="font-extrabold text-base text-gray-900 leading-snug group-hover:text-rwanda-green transition-colors">
                      {exp.title}
                    </h4>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">From</span>
                      <span className="text-sm font-extrabold text-gray-900">{exp.price}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{exp.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why RwandaGo — Trust & Value Architecture */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-wider text-rwanda-green">
            Built for Authentic Travel
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Why Plan with RwandaGo?
          </h2>
          <p className="text-gray-600 text-sm">
            We provide verified platform data, licensed operators, transparent budgeting, and direct connections without inflated middleman markups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-rwanda-green flex items-center justify-center font-bold text-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Verified Listings Only</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every hotel, tour operator, and licensed guide undergoes physical and administrative verification before receiving our verification badge.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Intelligent Trip Planner</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Build your custom day-by-day itinerary with drag-and-drop ease, track realistic travel times between cities, and estimate complete budgets in USD or RWF.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-rwanda-blue flex items-center justify-center font-bold text-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">RwandaGo AI Assistant</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ask questions naturally. Backed by verified database records rather than hallucinated rates, our AI ensures your trip is feasible and accurate.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Partner Call To Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-rwanda-green via-emerald-800 to-teal-900 text-white p-10 sm:p-16 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-rwanda-yellow inline-block">
              For Tourism Businesses & Guides
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              List your Hotel, Tour, or Experience on RwandaGo
            </h2>
            <p className="text-gray-200 text-base leading-relaxed">
              Reach thousands of international and regional travelers discovering Rwanda. Access our verified business portal, manage reservations, and grow your tourism business.
            </p>
            <div className="pt-2 flex items-center gap-4 flex-wrap">
              <Link
                href="/register"
                className="bg-rwanda-yellow hover:bg-rwanda-yellow-hover text-gray-900 font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-lg transition-transform hover:scale-105"
              >
                Become a Partner
              </Link>
              <Link
                href="/business"
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-6 py-3.5 rounded-2xl border border-white/30 backdrop-blur-md transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
