"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Bus, RefreshCw, MapPin, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/Button";

const VehicleMap = dynamic(
  () => import("@/components/map/VehicleMap").then((m) => m.VehicleMap),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">Loading map...</div> }
);

interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationUpdate: string | null;
  driverName: string | null;
  routeName: string | null;
  routeOrigin: string | null;
  routeDestination: string | null;
}

export default function TrackingPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setVehicles(data.vehicles || []);
          setLastUpdated(new Date());
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [refreshTrigger]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((n) => n + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeVehicles = vehicles.filter(
    (v) => v.currentLat && v.currentLng && (v.status === "en_route" || v.status === "active")
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Live Vehicle Tracking</h1>
          <p className="text-gray-500 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()} •{" "}
            {activeVehicles.length} vehicles active
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          loading={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-gray-900">Kenya Map</span>
              <span className="text-sm text-gray-400 ml-auto">
                🚌 = Active vehicle
              </span>
            </div>
            <VehicleMap
              vehicles={activeVehicles}
              centerLat={-1.2921}
              centerLng={36.8219}
              zoom={7}
              height="500px"
            />
          </div>
        </div>

        {/* Vehicle List */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900">
            Active Vehicles ({activeVehicles.length})
          </h2>

          {loading && vehicles.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeVehicles.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100">
              <Bus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No active vehicles</p>
              <p className="text-sm mt-1">Vehicles will appear here when drivers start their GPS</p>
            </div>
          ) : (
            activeVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-sm ${
                  selectedVehicle?.id === vehicle.id
                    ? "border-green-500"
                    : "border-gray-100 hover:border-green-300"
                }`}
                onClick={() =>
                  setSelectedVehicle(
                    selectedVehicle?.id === vehicle.id ? null : vehicle
                  )
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Bus className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">
                        {vehicle.plateNumber}
                      </div>
                      <div className="text-xs text-gray-400">{vehicle.model}</div>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    Live
                  </span>
                </div>

                {vehicle.routeName && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <MapPin className="h-3 w-3" />
                    {vehicle.routeOrigin} → {vehicle.routeDestination}
                  </div>
                )}

                {vehicle.driverName && (
                  <div className="text-xs text-gray-400">
                    Driver: {vehicle.driverName}
                  </div>
                )}

                {vehicle.lastLocationUpdate && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Clock className="h-3 w-3" />
                    Updated:{" "}
                    {new Date(vehicle.lastLocationUpdate).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))
          )}

          {/* All vehicles (inactive) */}
          {vehicles.filter((v) => !v.currentLat || v.status === "inactive").length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Inactive Vehicles
              </h3>
              {vehicles
                .filter((v) => !v.currentLat || v.status === "inactive")
                .map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <Bus className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">
                        {vehicle.plateNumber}
                      </span>
                      <span className="text-xs text-gray-400">{vehicle.model}</span>
                      <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                        {vehicle.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
