"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  User,
  Phone,
  Mail,
  Shield,
  Bus,
  BookOpen,
  CreditCard,
  LogOut,
  Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Booking {
  id: number;
  routeName: string;
  status: string;
  fareAmount: number;
  paymentStatus: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role === "passenger") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookingsLoading(true);
      fetch("/api/bookings")
        .then((r) => r.json())
        .then((d) => {
          setBookings(d.bookings || []);
          setBookingsLoading(false);
        })
        .catch(() => setBookingsLoading(false));
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!user) return null;

  const roleColors = {
    passenger: "bg-blue-100 text-blue-700",
    driver: "bg-green-100 text-green-700",
    manager: "bg-purple-100 text-purple-700",
  };

  const roleLabels = {
    passenger: "Passenger",
    driver: "Driver",
    manager: "SACCO Manager",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    picked_up: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-start gap-4">
          <div className="bg-green-600 rounded-full h-16 w-16 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  roleColors[user.role]
                }`}
              >
                {roleLabels[user.role]}
              </span>
            </div>

            <div className="space-y-1.5 mt-3">
              {user.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {user.phone}
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {user.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-gray-400" />
                Account verified & secure
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
          {user.role === "driver" && (
            <Button
              variant="outline"
              onClick={() => router.push("/driver")}
              className="flex-1"
            >
              <Bus className="h-4 w-4 mr-2" />
              Driver Dashboard
            </Button>
          )}
          {user.role === "manager" && (
            <Button
              variant="outline"
              onClick={() => router.push("/manager")}
              className="flex-1"
            >
              <Bus className="h-4 w-4 mr-2" />
              Manager Dashboard
            </Button>
          )}
          <Button
            variant="danger"
            onClick={handleLogout}
            className={user.role === "passenger" ? "flex-1" : ""}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Booking History (Passengers) */}
      {user.role === "passenger" && (
        <div>
          <h2 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            Booking History
          </h2>

          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No bookings yet</p>
              <p className="text-sm mt-1">Book your first matatu seat!</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/booking")}
              >
                Book Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {booking.routeName || "Unknown Route"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.pickupAddress} → {booking.dropoffAddress}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColor[booking.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {booking.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span
                          className={
                            booking.paymentStatus === "paid"
                              ? "text-green-600 font-medium"
                              : "text-red-500"
                          }
                        >
                          {booking.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(booking.fareAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(booking.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
