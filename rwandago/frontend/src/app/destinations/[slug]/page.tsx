import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { destinationService } from "../../../services/destinationService";
import { MapPin, Calendar, Clock, DollarSign, Lightbulb, ChevronLeft, ShieldCheck } from "lucide-react";

interface Props {
  params: {
    slug: string;
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const destination = await destinationService.getBySlug(params.slug);

  if (!destination) {
    notFound();
  }

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Cover */}
      <div className="relative h-[65vh] min-h-[450px] w-full bg-gray-900">
        <img
          src={destination.coverImageUrl}
          alt={destination.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-black/40 to-black/30" />

        <div className="absolute top-8 left-4 sm:left-8 z-10">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black/40 hover:bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Destinations</span>
          </Link>
        </div>

        <div className="absolute bottom-12 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-rwanda-green text-white text-xs font-black uppercase px-3 py-1 rounded-full">
              {destination.province}
            </span>
            <span className="bg-black/50 text-white backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rwanda-yellow" />
              {destination.district}
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight">
            {destination.name}
          </h1>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Col: Overview, Tips */}
        <div className="lg:col-span-8 space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">Overview</h2>
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
              {destination.description}
            </p>
          </section>

          {/* Travel Tips Card */}
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-3xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-base">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <span>Local Travel Tips & Practical Advice</span>
            </div>
            <p className="text-amber-950 text-sm leading-relaxed">
              {destination.travelTips}
            </p>
          </div>
        </div>

        {/* Right Col: Quick Fact Card */}
        <div className="lg:col-span-4">
          <div className="sticky top-28 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-lg space-y-6">
            <h3 className="font-extrabold text-xl text-gray-900 pb-3 border-b border-gray-100">
              Trip Planning Stats
            </h3>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-rwanda-green flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs uppercase font-bold text-gray-400">
                    Recommended Stay
                  </span>
                  <span className="text-sm font-extrabold text-gray-900">
                    {destination.recommendedDurationDays} Days
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs uppercase font-bold text-gray-400">
                    Estimated Daily Budget
                  </span>
                  <span className="text-sm font-extrabold text-gray-900">
                    ~${destination.estimatedDailyBudgetUsd} / day
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-rwanda-blue flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs uppercase font-bold text-gray-400">
                    Best Time to Visit
                  </span>
                  <span className="text-sm font-extrabold text-gray-900">
                    {destination.bestTimeToVisit}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <Link
                href={`/trip-planner?dest=${destination.slug}`}
                className="w-full py-3.5 bg-rwanda-green hover:bg-rwanda-green-dark text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                Plan a Trip to {destination.name}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
