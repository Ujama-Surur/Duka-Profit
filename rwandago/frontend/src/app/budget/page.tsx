"use client";

import React, { useState } from "react";
import { DollarSign, Users, Calendar, Hotel, Utensils, Car, Sparkles, RefreshCw } from "lucide-react";

export default function BudgetCalculatorPage() {
  const [currency, setCurrency] = useState<"USD" | "RWF" | "EUR" | "GBP">("USD");
  const [travelers, setTravelers] = useState(2);
  const [days, setDays] = useState(7);

  // Daily or total assumptions in USD
  const [accommodationPerNight, setAccommodationPerNight] = useState(120);
  const [foodPerPersonDay, setFoodPerPersonDay] = useState(35);
  const [transportPerDay, setTransportPerDay] = useState(50);
  const [activitiesPerPerson, setActivitiesPerPerson] = useState(350);
  const [otherPerDay, setOtherPerDay] = useState(15);

  const rates: Record<string, { symbol: string; rate: number }> = {
    USD: { symbol: "$", rate: 1.0 },
    RWF: { symbol: "FRw ", rate: 1320.0 },
    EUR: { symbol: "€", rate: 0.92 },
    GBP: { symbol: "£", rate: 0.78 },
  };

  const currentRate = rates[currency].rate;
  const symbol = rates[currency].symbol;

  // Calculations in USD
  const totalAccommodation = accommodationPerNight * days;
  const totalFood = foodPerPersonDay * travelers * days;
  const totalTransport = transportPerDay * days;
  const totalActivities = activitiesPerPerson * travelers;
  const totalOther = otherPerDay * days;

  const totalUsd = totalAccommodation + totalFood + totalTransport + totalActivities + totalOther;
  const perPersonUsd = travelers > 0 ? totalUsd / travelers : 0;
  const perDayUsd = days > 0 ? totalUsd / days : 0;

  const formatCurrency = (usdAmount: number) => {
    const converted = usdAmount * currentRate;
    return `${symbol}${Math.round(converted).toLocaleString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
          <DollarSign className="w-3.5 h-3.5" />
          <span>Centralized Rwanda Travel Estimator</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Rwanda Trip Budget Calculator
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          Estimate realistic travel expenditures across accommodation tiers, transport options, national park activities, and dining in Rwanda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8">
          {/* Base Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-rwanda-green"
              >
                <option value="USD">USD ($)</option>
                <option value="RWF">RWF (FRw)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Travelers
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={travelers}
                onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-rwanda-green"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Trip Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-rwanda-green"
              />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            {/* Accommodation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                  <Hotel className="w-4 h-4 text-rwanda-green" />
                  Accommodation per Night
                </span>
                <span className="font-black text-rwanda-green">
                  {formatCurrency(accommodationPerNight)}
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={800}
                step={10}
                value={accommodationPerNight}
                onChange={(e) => setAccommodationPerNight(parseInt(e.target.value))}
                className="w-full accent-rwanda-green cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Budget Guesthouse ($30)</span>
                <span>Midscale Hotel ($120)</span>
                <span>Luxury Eco-Lodge ($800)</span>
              </div>
            </div>

            {/* Food */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-rwanda-yellow" />
                  Food & Dining per Person / Day
                </span>
                <span className="font-black text-gray-900">
                  {formatCurrency(foodPerPersonDay)}
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={150}
                step={5}
                value={foodPerPersonDay}
                onChange={(e) => setFoodPerPersonDay(parseInt(e.target.value))}
                className="w-full accent-rwanda-yellow cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Local Cafes ($15)</span>
                <span>Mid-tier Bistro ($35)</span>
                <span>Fine Dining ($150)</span>
              </div>
            </div>

            {/* Transport */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-rwanda-blue" />
                  Transport & Driver per Day
                </span>
                <span className="font-black text-gray-900">
                  {formatCurrency(transportPerDay)}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={250}
                step={5}
                value={transportPerDay}
                onChange={(e) => setTransportPerDay(parseInt(e.target.value))}
                className="w-full accent-rwanda-blue cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Motos & Buses ($10)</span>
                <span>Rental Car ($60)</span>
                <span>Private 4x4 Safari Driver ($250)</span>
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Activities & Park Permits per Person
                </span>
                <span className="font-black text-purple-700">
                  {formatCurrency(activitiesPerPerson)}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={2500}
                step={50}
                value={activitiesPerPerson}
                onChange={(e) => setActivitiesPerPerson(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Canopy & Boat Tour ($150)</span>
                <span>Big Five Safari ($350)</span>
                <span>Gorilla Permit ($1,500+)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="lg:col-span-5 sticky top-28 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
            <div className="text-center pb-6 border-b border-gray-100 space-y-1">
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Total Estimated Trip Cost
              </span>
              <div className="text-4xl sm:text-5xl font-black text-rwanda-green tracking-tight">
                {formatCurrency(totalUsd)}
              </div>
              <span className="text-xs text-gray-500 font-medium">
                For {travelers} traveler{travelers > 1 ? "s" : ""} over {days} days
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="block text-[11px] uppercase font-bold text-gray-400">
                  Per Person
                </span>
                <span className="text-lg font-black text-gray-800">
                  {formatCurrency(perPersonUsd)}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="block text-[11px] uppercase font-bold text-gray-400">
                  Per Day
                </span>
                <span className="text-lg font-black text-gray-800">
                  {formatCurrency(perDayUsd)}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs uppercase font-bold text-gray-400">
                Expenditure Breakdown
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Accommodation</span>
                  <span>{formatCurrency(totalAccommodation)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Food & Dining</span>
                  <span>{formatCurrency(totalFood)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Transportation</span>
                  <span>{formatCurrency(totalTransport)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Activities & Permits</span>
                  <span>{formatCurrency(totalActivities)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Miscellaneous & Tips</span>
                  <span>{formatCurrency(totalOther)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
