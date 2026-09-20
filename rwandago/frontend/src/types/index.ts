export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  profileImageUrl?: string;
  roles: string[];
  isVerified: boolean;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  province: string;
  district: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string;
  recommendedDurationDays: number;
  estimatedDailyBudgetUsd: number;
  bestTimeToVisit: string;
  travelTips: string;
  description: string;
  isFeatured: boolean;
}

export interface Attraction {
  id: string;
  destinationId?: string;
  destinationName?: string;
  destinationSlug?: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string;
  openingHours: string;
  entryPriceUsd: number;
  entryPriceRwf: number;
  contactPhone?: string;
  website?: string;
  recommendedDurationHours: number;
  accessibilityInfo?: string;
  safetyInfo?: string;
  isVerified: boolean;
}

export interface Activity {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  durationMinutes: number;
  priceUsd: number;
  priceRwf: number;
  minParticipants: number;
  maxParticipants: number;
  coverImageUrl: string;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
}

export interface Accommodation {
  id: string;
  name: string;
  slug: string;
  propertyType: string;
  description: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string;
  pricePerNightMinUsd: number;
  pricePerNightMaxUsd: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}
