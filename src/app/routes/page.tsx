"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Bus,
  Clock,
  AlertTriangle,
  ChevronRight,
  Search,
  Navigation,
} from "lucide-react";
import { formatCurrency, estimateArrival } from "@/lib/utils";

interface RouteData {
  id: number;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  baseFarePerKm: number;
  estimatedDurationMin: number;
  activeVehicles: number;
  vehicles: Array<{
    id: number;
    plateNumber: string;
    model: string;
    status: string;
    capacity: number;
  }>;
}

interface TrafficAlert {
  id: number;
  title: string;
  description: string;
  severity: string;
  routeName: string;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/traffic").then((r) => r.json()),
    ]).then(([routeData, trafficData]) => {
      setRoutes(routeData.routes || []);
      setAlerts(trafficData.alerts || []);
      setLoading(false);
    });
  }, []);

  const filtered = routes.filter(
    (r) =>
      r.origin.toLowerCase().includes(search.toLowerCase()) ||
      r.destination.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  const severityColor = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Routes</h1>
        <p className="text-gray-500">
          Browse all matatu routes across Kenya. Click a route to see available vehicles.
        </p>
      </div>

      {/* Traffic Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Traffic Alerts
          </h2>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                severityColor[alert.severity as keyof typeof severityColor]
              }`}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">{alert.title}</span>
                {alert.description && (
                  <span className="ml-2 opacity-80">{alert.description}</span>
                )}
                {alert.routeName && (
                  <span className="ml-2 opacity-60">({alert.routeName})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search routes (e.g., Nairobi, Mombasa...)"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((route) => {
            const minFare = Math.round(route.distanceKm * route.baseFarePerKm * 0.5);
            const maxFare = Math.round(route.distanceKm * route.baseFarePerKm);

            return (
              <div
                key={route.id}
                className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                  selectedRoute?.id === route.id
                    ? "border-green-500 shadow-md"
                    : "border-gray-100 hover:border-green-300"
                }`}
                onClick={() =>
                  setSelectedRoute(selectedRoute?.id === route.id ? null : route)
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2.5 rounded-xl">
                      <Bus className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{route.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {route.origin} → {route.destination}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      selectedRoute?.id === route.id ? "rotate-90" : ""
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="font-bold text-gray-900">
                      {route.distanceKm} km
                    </div>
                    <div className="text-gray-400 text-xs">Distance</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="font-bold text-green-600">
                      KES {minFare}+
                    </div>
                    <div className="text-gray-400 text-xs">From</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="font-bold text-gray-900">
                      {route.activeVehicles}
                    </div>
                    <div className="text-gray-400 text-xs">Active Vehicles</div>
                  </div>
                </div>

                {route.estimatedDurationMin && (
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    Estimated: {estimateArrival(route.distanceKm)}
                  </div>
                )}

                {/* Expanded vehicle list */}
                {selectedRoute?.id === route.id && route.vehicles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm">
                      Available Vehicles ({route.vehicles.length})
                    </h4>
                    <div className="space-y-2">
                      {route.vehicles.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Bus className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{v.plateNumber}</span>
                            <span className="text-gray-400">{v.model}</span>
                          </div>
                          <div className="flex items-center gap-2">
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
                            <span className="text-gray-400">{v.capacity} seats</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={`/booking?routeId=${route.id}`}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                    >
                      <Navigation className="h-4 w-4" />
                      Book on This Route
                    </Link>
                  </div>
                )}

                {selectedRoute?.id === route.id && route.vehicles.length === 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
                    No vehicles currently assigned to this route.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No routes found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
