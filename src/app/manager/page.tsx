"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Bus,
  Users,
  TrendingUp,
  Navigation,
  Star,
  BookOpen,
  DollarSign,
  Activity,
  BarChart3,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const VehicleMap = dynamic(
  () => import("@/components/map/VehicleMap").then((m) => m.VehicleMap),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> }
);

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  totalPassengers: number;
  totalTrips: number;
  totalRevenue: number;
  totalBookings: number;
  averageRating: number;
}

interface RecentTrip {
  id: number;
  driverName: string | null;
  vehiclePlate: string | null;
  status: string;
  totalRevenue: number | null;
  passengersCount: number | null;
  startTime: string | null;
}

interface DriverPerformance {
  driverId: number;
  driverName: string | null;
  totalTrips: number;
  totalRevenue: number | null;
}

interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  driverName: string | null;
  routeName: string | null;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [driverPerformance, setDriverPerformance] = useState<DriverPerformance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "vehicles" | "drivers" | "map">("overview");

  useEffect(() => {
    if (!user || user.role !== "manager") {
      router.push("/login");
      return;
    }

    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
    ]).then(([dashData, vehicleData]) => {
      setStats(dashData.stats);
      setRecentTrips(dashData.recentTrips || []);
      setDriverPerformance(dashData.driverPerformance || []);
      setVehicles(vehicleData.vehicles || []);
      setLoading(false);
    });
  }, [user, router]);

  if (!user || user.role !== "manager") return null;

  const statCards = stats
    ? [
        {
          label: "Total Vehicles",
          value: stats.totalVehicles,
          icon: Bus,
          color: "bg-blue-50 text-blue-600",
          sub: `${stats.activeVehicles} active`,
        },
        {
          label: "Total Revenue",
          value: formatCurrency(stats.totalRevenue),
          icon: DollarSign,
          color: "bg-green-50 text-green-600",
          sub: `${stats.totalBookings} bookings`,
        },
        {
          label: "Total Drivers",
          value: stats.totalDrivers,
          icon: Users,
          color: "bg-purple-50 text-purple-600",
          sub: "registered",
        },
        {
          label: "Total Passengers",
          value: stats.totalPassengers,
          icon: Users,
          color: "bg-yellow-50 text-yellow-600",
          sub: "registered",
        },
        {
          label: "Total Trips",
          value: stats.totalTrips,
          icon: Navigation,
          color: "bg-indigo-50 text-indigo-600",
          sub: "completed",
        },
        {
          label: "Avg Rating",
          value: stats.averageRating ? `${Number(stats.averageRating).toFixed(1)} ⭐` : "N/A",
          icon: Star,
          color: "bg-orange-50 text-orange-600",
          sub: "driver rating",
        },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">SACCO Manager Dashboard</h1>
        <p className="text-gray-500">Monitor your fleet, drivers, and revenue</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        {[
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "vehicles", label: "Vehicles", icon: Bus },
          { key: "drivers", label: "Drivers", icon: Users },
          { key: "map", label: "Live Map", icon: Navigation },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-24" />
                ))
              : statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className={`inline-flex p-2 rounded-lg mb-2 ${stat.color}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                    <div className="text-xs text-gray-400">{stat.sub}</div>
                  </div>
                ))}
          </div>

          {/* Recent Trips */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Recent Trips
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentTrips.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No trips yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Driver</th>
                      <th className="pb-3 font-medium">Vehicle</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Passengers</th>
                      <th className="pb-3 font-medium">Revenue</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50">
                        <td className="py-3 font-medium">{trip.driverName || "N/A"}</td>
                        <td className="py-3 text-gray-500">{trip.vehiclePlate || "N/A"}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              trip.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : trip.status === "ongoing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {trip.status}
                          </span>
                        </td>
                        <td className="py-3">{trip.passengersCount || 0}</td>
                        <td className="py-3 font-semibold text-green-600">
                          {formatCurrency(trip.totalRevenue || 0)}
                        </td>
                        <td className="py-3 text-gray-400 text-xs">
                          {trip.startTime ? formatDate(trip.startTime) : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <Bus className="h-5 w-5 text-green-600" />
            Fleet Management ({vehicles.length} vehicles)
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">Plate</th>
                    <th className="pb-3 font-medium">Model</th>
                    <th className="pb-3 font-medium">Driver</th>
                    <th className="pb-3 font-medium">Route</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-3 font-bold">{v.plateNumber}</td>
                      <td className="py-3 text-gray-500">{v.model}</td>
                      <td className="py-3">{v.driverName || "Unassigned"}</td>
                      <td className="py-3 text-gray-500">{v.routeName || "No route"}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            v.status === "en_route"
                              ? "bg-green-100 text-green-700"
                              : v.status === "active"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {v.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs ${
                            v.currentLat ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {v.currentLat ? "🟢 Live" : "⚫ Offline"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Drivers Tab */}
      {activeTab === "drivers" && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Driver Performance
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : driverPerformance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No driver data yet</p>
          ) : (
            <div className="space-y-3">
              {driverPerformance.map((driver, index) => (
                <div
                  key={driver.driverId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-yellow-400 text-yellow-900"
                          : index === 1
                          ? "bg-gray-300 text-gray-700"
                          : index === 2
                          ? "bg-orange-300 text-orange-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {driver.driverName || "Unknown Driver"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {driver.totalTrips} trips
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(driver.totalRevenue || 0)}
                    </div>
                    <div className="text-xs text-gray-400">total revenue</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Tab */}
      {activeTab === "map" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Live Fleet Map</h2>
            <p className="text-sm text-gray-500">
              {vehicles.filter((v) => v.currentLat).length} vehicles broadcasting location
            </p>
          </div>
          <VehicleMap
            vehicles={vehicles.filter((v) => v.currentLat)}
            centerLat={-1.2921}
            centerLng={36.8219}
            zoom={7}
            height="600px"
          />
        </div>
      )}
    </div>
  );
}
