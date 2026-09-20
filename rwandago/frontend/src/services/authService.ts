import { apiRequest } from "./apiClient";
import { AuthResponse, User } from "../types";

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country?: string;
    phone?: string;
    role?: string;
  }) {
    const res = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.success && res.data?.accessToken) {
      localStorage.setItem("rwandago_token", res.data.accessToken);
      localStorage.setItem("rwandago_user", JSON.stringify(res.data.user));
    }
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.success && res.data?.accessToken) {
      localStorage.setItem("rwandago_token", res.data.accessToken);
      localStorage.setItem("rwandago_user", JSON.stringify(res.data.user));
    }
    return res;
  },

  logout() {
    localStorage.removeItem("rwandago_token");
    localStorage.removeItem("rwandago_user");
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("rwandago_user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("rwandago_token");
  },
};
