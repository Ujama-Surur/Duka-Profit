"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Users, Building, MapPin, Eye } from "lucide-react";

interface PendingBusiness {
  id: string;
  businessName: string;
  ownerName: string;
  type: string;
  tinNumber: string;
  location: string;
  submittedDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const INITIAL_PENDING: PendingBusiness[] = [
  {
    id: "b-1",
    businessName: "Kivu Horizon Kayak & Boat Tours",
    ownerName: "Claude Ndagijimana",
    type: "ACTIVITY_PROVIDER",
    tinNumber: "TIN-109283748",
    location: "Rubavu, Western Province",
    submittedDate: "2026-09-14",
    status: "PENDING",
  },
  {
    id: "b-2",
    businessName: "Bisoke Eco Sanctuary Lodge",
    ownerName: "Aline Uwase",
    type: "ACCOMMODATION",
    tinNumber: "TIN-894726190",
    location: "Kinigi, Musanze",
    submittedDate: "2026-09-15",
    status: "PENDING",
  },
  {
    id: "b-3",
    businessName: "Akagera Savanna 4x4 Expeditions",
    ownerName: "Emmanuel Habimana",
    type: "TRANSPORT_PROVIDER",
    tinNumber: "TIN-556473829",
    location: "Kayonza, Eastern Province",
    submittedDate: "2026-09-15",
    status: "PENDING",
  },
];

export default function AdminDashboardPage() {
  const [businesses, setBusinesses] = useState<PendingBusiness[]>(INITIAL_PENDING);

  const handleAction = (id: string, newStatus: "APPROVED" | "REJECTED") => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Official Tourism Authority Verification Desk</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            RwandaGo Administrative Portal
          </h1>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase">Pending Verifications</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-gray-900">
            {businesses.filter((b) => b.status === "PENDING").length}
          </div>
          <span className="text-xs text-amber-600 font-semibold">Requires officer review</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase">Verified Businesses</span>
            <Building className="w-5 h-5 text-rwanda-green" />
          </div>
          <div className="text-3xl font-black text-gray-900">142</div>
          <span className="text-xs text-rwanda-green font-semibold">Live in catalog</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase">Registered Travelers</span>
            <Users className="w-5 h-5 text-rwanda-blue" />
          </div>
          <div className="text-3xl font-black text-gray-900">4,890</div>
          <span className="text-xs text-rwanda-blue font-semibold">+320 this month</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase">Destinations Active</span>
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-gray-900">7</div>
          <span className="text-xs text-purple-600 font-semibold">All provinces covered</span>
        </div>
      </div>

      {/* Verification Queue */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Tourism Business Verification Queue
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review RDB / RRA tax documents and physical licenses before granting verified badges.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-extrabold tracking-wider">
              <tr>
                <th className="px-6 py-4">Business</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">TIN / Registration</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-gray-900">{b.businessName}</div>
                    <div className="text-xs text-gray-400">{b.ownerName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      {b.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">{b.tinNumber}</td>
                  <td className="px-6 py-4 text-xs">{b.location}</td>
                  <td className="px-6 py-4">
                    {b.status === "PENDING" && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        Pending Review
                      </span>
                    )}
                    {b.status === "APPROVED" && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {b.status === "REJECTED" && (
                      <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {b.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleAction(b.id, "APPROVED")}
                          className="px-3 py-1.5 bg-rwanda-green hover:bg-rwanda-green-dark text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Approve & Verify
                        </button>
                        <button
                          onClick={() => handleAction(b.id, "REJECTED")}
                          className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-red-600 text-xs font-bold rounded-lg"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {b.status !== "PENDING" && (
                      <span className="text-xs text-gray-400 font-semibold">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
