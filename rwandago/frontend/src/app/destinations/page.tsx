import React from "react";
import Link from "next/link";
import { destinationService } from "../../services/destinationService";
import { DestinationCard } from "../../components/cards/DestinationCard";
import { MapPin, Compass } from "lucide-react";

export default async function DestinationsPage() {
  const destinations = await destinationService.getDestinations();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-rwanda-green text-xs font-bold px-3 py-1.5 rounded-full">
          <Compass className="w-3.5 h-3.5" />
          <span>Rwanda Destination Atlas</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Explore All Destinations in Rwanda
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          From the vibrant hills of Kigali to the volcanic realm of mountain gorillas in Musanze, the sandy beaches of Lake Kivu, and the Big Five savannas of Akagera.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {destinations.map((dest) => (
          <DestinationCard key={dest.id} destination={dest} />
        ))}
      </div>
    </div>
  );
}
