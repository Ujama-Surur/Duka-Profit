"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Sparkles, Plus, Trash2, DollarSign, GripVertical, CheckCircle2 } from "lucide-react";

interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  type: "ATTRACTION" | "HOTEL" | "ACTIVITY" | "RESTAURANT" | "TRANSFER";
  location: string;
  costUsd: number;
}

interface TripDay {
  dayNumber: number;
  date: string;
  title: string;
  items: ItineraryItem[];
}

const INITIAL_TRIP: TripDay[] = [
  {
    dayNumber: 1,
    date: "Day 1",
    title: "Kigali Arrival & Cultural Heritage",
    items: [
      {
        id: "1-1",
        time: "09:00 AM",
        title: "Kigali Genocide Memorial",
        type: "ATTRACTION",
        location: "Gisozi, Kigali",
        costUsd: 0,
      },
      {
        id: "1-2",
        time: "12:30 PM",
        title: "Lunch at Heaven Restaurant",
        type: "RESTAURANT",
        location: "Kiyovu, Kigali",
        costUsd: 25,
      },
      {
        id: "1-3",
        time: "03:00 PM",
        title: "Kimironko Market & Artisan Shopping",
        type: "ACTIVITY",
        location: "Kimironko, Kigali",
        costUsd: 15,
      },
    ],
  },
  {
    dayNumber: 2,
    date: "Day 2",
    title: "Journey North: Kigali → Musanze (Volcanoes)",
    items: [
      {
        id: "2-1",
        time: "08:30 AM",
        title: "Scenic Transfer to Musanze via Express Coach",
        type: "TRANSFER",
        location: "Kigali → Musanze",
        costUsd: 12,
      },
      {
        id: "2-2",
        time: "02:00 PM",
        title: "Check-in at Five Volcanoes Boutique Lodge",
        type: "HOTEL",
        location: "Kinigi, Musanze",
        costUsd: 280,
      },
      {
        id: "2-3",
        time: "04:30 PM",
        title: "Musanze Caves Guided Tour",
        type: "ACTIVITY",
        location: "Musanze",
        costUsd: 50,
      },
    ],
  },
  {
    dayNumber: 3,
    date: "Day 3",
    title: "Volcanoes National Park Gorilla Trekking",
    items: [
      {
        id: "3-1",
        time: "06:30 AM",
        title: "Gorilla Trekking Briefing & Expedition",
        type: "ACTIVITY",
        location: "Volcanoes National Park Headquarters",
        costUsd: 1500,
      },
      {
        id: "3-2",
        time: "04:00 PM",
        title: "Iby'Iwacu Cultural Village Experience",
        type: "ACTIVITY",
        location: "Kinigi",
        costUsd: 35,
      },
    ],
  },
];

export default function TripPlannerPage() {
  const [trip, setTrip] = useState<TripDay[]>(INITIAL_TRIP);
  const [activeDay, setActiveDay] = useState(1);

  const totalBudget = trip.reduce((acc, day) => {
    return acc + day.items.reduce((itemAcc, item) => itemAcc + item.costUsd, 0);
  }, 0);

  const currentDayData = trip.find((d) => d.dayNumber === activeDay) || trip[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-rwanda-green text-xs font-bold px-3 py-1 rounded-full mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Interactive Trip Planner</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            7 Days in Rwanda: Gorillas, Hills & Lakes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customizable itinerary with realistic travel times, verified costs, and activity sequencing.
          </p>
        </div>

        {/* Budget summary card */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md flex items-center gap-6">
          <div>
            <span className="block text-[11px] uppercase font-bold text-gray-400">
              Estimated Total (Per Person)
            </span>
            <span className="text-2xl font-black text-gray-900">
              ${totalBudget.toLocaleString()}
            </span>
          </div>
          <Link
            href="/budget"
            className="px-4 py-2.5 bg-rwanda-yellow hover:bg-rwanda-yellow-hover text-gray-900 text-xs font-extrabold rounded-xl shadow-sm transition-transform hover:scale-105"
          >
            Adjust Budget
          </Link>
        </div>
      </div>

      {/* Main planner columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Day Selector Navigation */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-lg text-gray-900">Itinerary Days</h3>
          <div className="space-y-2">
            {trip.map((day) => {
              const dayCost = day.items.reduce((acc, i) => acc + i.costUsd, 0);
              const isActive = day.dayNumber === activeDay;
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => setActiveDay(day.dayNumber)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isActive
                      ? "border-rwanda-green bg-emerald-50/60 shadow-sm"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isActive ? "text-rwanda-green" : "text-gray-500"}`}>
                      {day.date}
                    </span>
                    <span className="text-xs font-extrabold text-gray-800">
                      ${dayCost.toLocaleString()}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900 line-clamp-1">
                    {day.title}
                  </h4>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    {day.items.length} activities scheduled
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => alert("RwandaGo AI Assistant will auto-generate additional days.")}
            className="w-full py-3 border-2 border-dashed border-emerald-300 hover:border-rwanda-green rounded-2xl text-rwanda-green text-xs font-extrabold flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate with RwandaGo AI</span>
          </button>
        </div>

        {/* Day Details & Item Schedule */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <span className="text-xs font-bold text-rwanda-green uppercase">
                {currentDayData.date} Schedule
              </span>
              <h2 className="text-2xl font-black text-gray-900">
                {currentDayData.title}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full">
              {currentDayData.items.length} Items
            </span>
          </div>

          {/* Timeline Items */}
          <div className="space-y-4">
            {currentDayData.items.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
              >
                <div className="text-gray-300 group-hover:text-gray-500 pt-1 cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-rwanda-green bg-emerald-50 px-2.5 py-0.5 rounded-md">
                      {item.time}
                    </span>
                    <span className="text-[10px] uppercase font-black text-gray-400">
                      {item.type}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-base text-gray-900">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{item.location}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-gray-900">
                    {item.costUsd > 0 ? `$${item.costUsd}` : "Free"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
