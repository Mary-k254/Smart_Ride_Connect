"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  Bus,
  CreditCard,
  CheckCircle,
  Phone,
  Navigation,
  Calculator,
} from "lucide-react";
import { calculateDistance, calculateFare, formatCurrency } from "@/lib/utils";

interface Route {
  id: number;
  name: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceKm: number;
  baseFarePerKm: number;
}

interface Vehicle {
  id: number;
  plateNumber: string;
  model: string;
  capacity: number;
  status: string;
  driverName: string;
}

function BookingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRouteId = searchParams.get("routeId");

  const [step, setStep] = useState(1);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const [selectedRouteId, setSelectedRouteId] = useState<number>(
    preselectedRouteId ? parseInt(preselectedRouteId) : 0
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(0);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((d) => setRoutes(d.routes || []));
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetch(`/api/vehicles?routeId=${selectedRouteId}`)
        .then((r) => r.json())
        .then((d) => setVehicles(d.vehicles || []));
    }
  }, [selectedRouteId]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId),
    [routes, selectedRouteId]
  );

  // Derived values - no effects needed
  const pickupLat = selectedRoute?.originLat ?? 0;
  const pickupLng = selectedRoute?.originLng ?? 0;
  const dropoffLat = selectedRoute?.destLat ?? 0;
  const dropoffLng = selectedRoute?.destLng ?? 0;

  const fareInfo = useMemo(() => {
    if (pickupLat && dropoffLat && selectedRoute) {
      const dist = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      const fare = calculateFare(dist, selectedRoute.baseFarePerKm);
      return { distanceKm: Math.round(dist * 10) / 10, fareAmount: fare };
    }
    return { distanceKm: selectedRoute?.distanceKm ?? 0, fareAmount: 0 };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, selectedRoute]);

  // Set default addresses when route changes
  const displayPickup = pickupAddress || selectedRoute?.origin || "";
  const displayDropoff = dropoffAddress || selectedRoute?.destination || "";

  const handleBooking = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: selectedRouteId,
          vehicleId: selectedVehicleId || null,
          pickupLat,
          pickupLng,
          pickupAddress: displayPickup,
          dropoffLat,
          dropoffLng,
          dropoffAddress: displayDropoff,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingId(data.booking.id);
        setStep(3);
      } else {
        alert(data.error || "Booking failed");
      }
    } catch {
      alert("Booking failed");
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!bookingId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          method: paymentMethod,
          phoneNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(true);
      } else {
        alert(data.error || "Payment failed");
      }
    } catch {
      alert("Payment failed");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Bus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-500 mb-6">Please login to book a seat</p>
        <Button onClick={() => router.push("/login")} size="lg">
          Login to Book
        </Button>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-green-100 rounded-full p-6 inline-flex mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
        <p className="text-gray-500 mb-2">
          Your seat has been reserved and payment received.
        </p>
        <p className="text-gray-500 mb-8">
          You will receive a notification when the vehicle is approaching.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/tracking")} variant="outline">
            Track Vehicle
          </Button>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Seat</h1>
      <p className="text-gray-500 mb-8">Reserve your seat on a long-distance matatu</p>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Route" },
          { n: 2, label: "Details" },
          { n: 3, label: "Payment" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                step >= s.n
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s.n}
            </div>
            <span
              className={`text-sm font-medium ${
                step >= s.n ? "text-green-600" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < 2 && <div className="flex-1 h-0.5 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Route Selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Select Your Route
          </h2>

          <div className="space-y-3">
            {routes.map((route) => (
              <button
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedRouteId === route.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{route.name}</div>
                    <div className="text-sm text-gray-500">
                      {route.origin} → {route.destination}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      KES {Math.round(route.distanceKm * route.baseFarePerKm)}
                    </div>
                    <div className="text-xs text-gray-400">{route.distanceKm} km</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            disabled={!selectedRouteId}
            onClick={() => setStep(2)}
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Trip Details */}
      {step === 2 && selectedRoute && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <Navigation className="h-5 w-5 text-green-600" />
            Trip Details
          </h2>

          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <div className="font-semibold text-green-800">{selectedRoute.name}</div>
            <div className="text-sm text-green-600">
              {selectedRoute.origin} → {selectedRoute.destination} ({selectedRoute.distanceKm} km)
            </div>
          </div>

          {/* Pickup */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Pickup Location
            </label>
            <input
              type="text"
              value={displayPickup}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Enter pickup address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {/* Dropoff */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Drop-off Location
            </label>
            <input
              type="text"
              value={displayDropoff}
              onChange={(e) => setDropoffAddress(e.target.value)}
              placeholder="Enter drop-off address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {/* Vehicle Selection */}
          {vehicles.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Vehicle (Optional)
              </label>
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                      selectedVehicleId === v.id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{v.plateNumber}</span>
                        <span className="text-gray-400">{v.model}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          v.status === "en_route"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {v.status.replace("_", " ")}
                      </span>
                    </div>
                    {v.driverName && (
                      <div className="text-gray-400 text-xs mt-1">
                        Driver: {v.driverName}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fare Estimate */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Fare Estimate</span>
            </div>
            <div className="text-sm text-yellow-700 space-y-1">
              <div className="flex justify-between">
                <span>Distance:</span>
                <span className="font-medium">{fareInfo.distanceKm} km</span>
              </div>
              <div className="flex justify-between">
                <span>Rate per km:</span>
                <span className="font-medium">KES {selectedRoute.baseFarePerKm}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-yellow-900 pt-1 border-t border-yellow-200">
                <span>Total Fare:</span>
                <span>
                  {formatCurrency(fareInfo.fareAmount || Math.round(selectedRoute.distanceKm * selectedRoute.baseFarePerKm))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleBooking}
              loading={loading}
              className="flex-1"
              size="lg"
            >
              Confirm Booking
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Payment
          </h2>

          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <div className="text-sm text-green-700 mb-1">Amount to Pay</div>
            <div className="text-3xl font-bold text-green-800">
              {formatCurrency(fareInfo.fareAmount || Math.round((selectedRoute?.distanceKm || 0) * (selectedRoute?.baseFarePerKm || 10)))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "mpesa", label: "M-Pesa", emoji: "📱" },
                { value: "card", label: "Card", emoji: "💳" },
                { value: "cash", label: "Cash", emoji: "💵" },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    paymentMethod === method.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{method.emoji}</div>
                  <div className="text-sm font-medium">{method.label}</div>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "mpesa" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                M-Pesa Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254700000000"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                You will receive an M-Pesa prompt on this number
              </p>
            </div>
          )}

          <Button
            onClick={handlePayment}
            loading={loading}
            className="w-full"
            size="lg"
          >
            Pay Now
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}
