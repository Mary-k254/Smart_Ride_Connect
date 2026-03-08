"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import dynamic from "next/dynamic";
import {
  Bus,
  Navigation,
  MapPin,
  Users,
  Play,
  Square,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const VehicleMap = dynamic(
  () => import("@/components/map/VehicleMap").then((m) => m.VehicleMap),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> }
);

interface Trip {
  id: number;
  routeName: string;
  vehiclePlate: string;
  status: string;
  startTime: string;
  endTime: string | null;
  passengersCount: number;
  totalRevenue: number;
  distanceKm: number | null;
}

interface TrafficAlert {
  id: number;
  title: string;
  description: string;
  severity: string;
}

interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  routeId: number | null;
  routeName: string | null;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [myVehicle, setMyVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsInterval, setGpsIntervalRef] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      router.push("/login");
      return;
    }

    Promise.all([
      fetch("/api/trips").then((r) => r.json()),
      fetch("/api/traffic").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
    ]).then(([tripData, trafficData, vehicleData]) => {
      setTrips(tripData.trips || []);
      setAlerts(trafficData.alerts || []);
      // Find vehicle assigned to this driver
      const driverVehicle = (vehicleData.vehicles || []).find(
        (v: Vehicle & { driverId: number }) => v.driverId === user.id
      );
      setMyVehicle(driverVehicle || null);
      setLoading(false);
    });
  }, [user, router]);

  const startGPS = () => {
    if (!myVehicle) return;

    setGpsActive(true);
    // Simulate GPS updates (in production, use real GPS)
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetch(`/api/vehicles/${myVehicle.id}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
            });
          },
          () => {
            // Fallback: simulate movement near Nairobi
            const lat = -1.2921 + (Math.random() - 0.5) * 0.1;
            const lng = 36.8219 + (Math.random() - 0.5) * 0.1;
            fetch(`/api/vehicles/${myVehicle.id}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat, lng }),
            });
          }
        );
      }
    }, 10000); // Update every 10 seconds

    setGpsIntervalRef(interval);
  };

  const stopGPS = () => {
    setGpsActive(false);
    if (gpsInterval) {
      clearInterval(gpsInterval);
      setGpsIntervalRef(null);
    }
  };

  const todayTrips = trips.filter((t) => {
    const today = new Date().toDateString();
    return new Date(t.startTime).toDateString() === today;
  });

  const todayRevenue = todayTrips.reduce((sum, t) => sum + (t.totalRevenue || 0), 0);
  const totalPassengers = todayTrips.reduce((sum, t) => sum + (t.passengersCount || 0), 0);

  if (!user || user.role !== "driver") return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Driver Dashboard
        </h1>
        <p className="text-gray-500">Welcome back, {user.name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Today's Trips",
            value: todayTrips.length,
            icon: Navigation,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Today's Revenue",
            value: formatCurrency(todayRevenue),
            icon: TrendingUp,
            color: "bg-green-50 text-green-600",
          },
          {
            label: "Passengers Today",
            value: totalPassengers,
            icon: Users,
            color: "bg-purple-50 text-purple-600",
          },
          {
            label: "Total Trips",
            value: trips.length,
            icon: Bus,
            color: "bg-yellow-50 text-yellow-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className={`inline-flex p-2 rounded-lg mb-2 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* GPS Control */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <Navigation className="h-5 w-5 text-green-600" />
            GPS Tracking
          </h2>

          {myVehicle ? (
            <div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bus className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold">{myVehicle.plateNumber}</span>
                  <span className="text-gray-400">{myVehicle.model}</span>
                </div>
                {myVehicle.routeName && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    Route: {myVehicle.routeName}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    gpsActive ? "bg-green-500 animate-pulse" : "bg-gray-300"
                  }`}
                />
                <span className="text-sm font-medium">
                  GPS {gpsActive ? "Active - Broadcasting Location" : "Inactive"}
                </span>
              </div>

              {gpsActive ? (
                <Button
                  variant="danger"
                  onClick={stopGPS}
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop GPS
                </Button>
              ) : (
                <Button onClick={startGPS} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start GPS Tracking
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Bus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No vehicle assigned</p>
              <p className="text-sm">Contact your SACCO manager</p>
            </div>
          )}
        </div>

        {/* Traffic Alerts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Traffic Alerts
          </h2>

          {alerts.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No active traffic alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-sm ${
                    alert.severity === "high"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : alert.severity === "medium"
                      ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                      : "bg-green-50 border-green-200 text-green-700"
                  }`}
                >
                  <div className="font-semibold">{alert.title}</div>
                  {alert.description && (
                    <div className="mt-0.5 opacity-80">{alert.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      {myVehicle && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">My Location</h2>
          </div>
          <VehicleMap
            vehicles={myVehicle.currentLat ? [{ ...myVehicle, driverName: user.name }] : []}
            centerLat={myVehicle.currentLat || -1.2921}
            centerLng={myVehicle.currentLng || 36.8219}
            zoom={12}
            height="300px"
          />
        </div>
      )}

      {/* Trip History */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-green-600" />
          Trip History
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Navigation className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No trips yet. Start your first trip!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.slice(0, 10).map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {trip.routeName || "Unknown Route"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(trip.startTime)} • {trip.passengersCount} passengers
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600 text-sm">
                    {formatCurrency(trip.totalRevenue || 0)}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      trip.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : trip.status === "ongoing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
