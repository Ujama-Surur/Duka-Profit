import React from "react";
import Link from "next/link";
import { MapPin, Clock, DollarSign, ArrowRight } from "lucide-react";
import { Destination } from "../../types";

interface DestinationCardProps {
  destination: Destination;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({ destination }) => {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative h-64 w-full overflow-hidden bg-gray-100">
        <img
          src={destination.coverImageUrl}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className="bg-white/90 backdrop-blur-md text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            {destination.province}
          </span>
          {destination.isFeatured && (
            <span className="bg-rwanda-yellow text-gray-900 text-xs font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              ★ Featured
            </span>
          )}
        </div>

        {/* Bottom Title on Image */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-2xl font-black tracking-tight">{destination.name}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-200 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-rwanda-yellow" />
            <span>{destination.district}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {destination.description}
        </p>

        {/* Key Metrics */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-700">
            <Clock className="w-4 h-4 text-rwanda-green" />
            <span className="font-semibold">{destination.recommendedDurationDays} Days Ideal</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700 justify-end">
            <DollarSign className="w-4 h-4 text-rwanda-yellow" />
            <span className="font-semibold">~${destination.estimatedDailyBudgetUsd}/day</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-2 text-rwanda-green font-bold text-sm group-hover:text-rwanda-green-dark">
          <span>Explore Destination</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};
