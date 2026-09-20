import { apiRequest } from "./apiClient";
import { Destination, Attraction } from "../types";

const FALLBACK_DESTINATIONS: Destination[] = [
  {
    id: "dest-1",
    name: "Kigali",
    slug: "kigali",
    province: "Kigali City",
    district: "Gasabo, Nyarugenge, Kicukiro",
    latitude: -1.9441,
    longitude: 30.0619,
    coverImageUrl: "https://images.unsplash.com/photo-1609198092458-38a293c7ac4b?auto=format&fit=crop&w=1200&q=80",
    recommendedDurationDays: 3,
    estimatedDailyBudgetUsd: 75,
    bestTimeToVisit: "Year-round",
    travelTips: "Extremely clean and safe; moto taxis are fast and affordable.",
    description: "Rwanda's vibrant capital, celebrated for lush hills, flourishing art galleries, world-class coffee, and serene avenues.",
    isFeatured: true,
  },
  {
    id: "dest-2",
    name: "Musanze & Volcanoes",
    slug: "musanze",
    province: "Northern Province",
    district: "Musanze",
    latitude: -1.4998,
    longitude: 29.635,
    coverImageUrl: "https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=1200&q=80",
    recommendedDurationDays: 3,
    estimatedDailyBudgetUsd: 180,
    bestTimeToVisit: "June - September & Dec - Feb",
    travelTips: "Book gorilla trekking permits well in advance; pack sturdy hiking boots.",
    description: "The dramatic gateway to Volcanoes National Park, sanctuary of the endangered mountain gorillas and misty volcanic peaks.",
    isFeatured: true,
  },
  {
    id: "dest-3",
    name: "Rubavu & Lake Kivu",
    slug: "rubavu",
    province: "Western Province",
    district: "Rubavu",
    latitude: -1.6744,
    longitude: 29.2562,
    coverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    recommendedDurationDays: 2,
    estimatedDailyBudgetUsd: 85,
    bestTimeToVisit: "June - August",
    travelTips: "Safe for swimming and sunset boat tours; enjoy fresh Sambaza fish.",
    description: "A tranquil resort retreat nestled along sandy lake shores, offering kayaking, hot springs, and relaxing lakeside lodges.",
    isFeatured: true,
  },
  {
    id: "dest-4",
    name: "Akagera National Park",
    slug: "akagera",
    province: "Eastern Province",
    district: "Kayonza",
    latitude: -1.88,
    longitude: 30.7,
    coverImageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
    recommendedDurationDays: 2,
    estimatedDailyBudgetUsd: 140,
    bestTimeToVisit: "June to October",
    travelTips: "Start game drives at dawn to catch predators active.",
    description: "Central Africa's largest protected savanna wetland, teeming with lions, rhinos, leopards, elephants, and boat safaris on Lake Ihema.",
    isFeatured: true,
  },
  {
    id: "dest-5",
    name: "Nyungwe Rainforest",
    slug: "nyungwe",
    province: "Western Province",
    district: "Rusizi",
    latitude: -2.4833,
    longitude: 29.2,
    coverImageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    recommendedDurationDays: 3,
    estimatedDailyBudgetUsd: 150,
    bestTimeToVisit: "Year-round",
    travelTips: "Wear rain gear and sturdy boots for the canopy walk and chimpanzee treks.",
    description: "Ancient high-altitude rainforest sanctuary featuring an exhilarating 70m high canopy walk, waterfalls, and 13 primate species.",
    isFeatured: true,
  },
];

export const destinationService = {
  async getDestinations(): Promise<Destination[]> {
    const res = await apiRequest<Destination[]>("/destinations");
    if (res.success && res.data && res.data.length > 0) {
      return res.data;
    }
    return FALLBACK_DESTINATIONS;
  },

  async getFeatured(): Promise<Destination[]> {
    const res = await apiRequest<Destination[]>("/destinations/featured");
    if (res.success && res.data && res.data.length > 0) {
      return res.data;
    }
    return FALLBACK_DESTINATIONS.filter((d) => d.isFeatured);
  },

  async getBySlug(slug: string): Promise<Destination | null> {
    const res = await apiRequest<Destination>(`/destinations/${slug}`);
    if (res.success && res.data) {
      return res.data;
    }
    return FALLBACK_DESTINATIONS.find((d) => d.slug === slug) || null;
  },
};
