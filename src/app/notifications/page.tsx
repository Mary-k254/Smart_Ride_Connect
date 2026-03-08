"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Bell, CheckCheck, Bus, CreditCard, AlertTriangle, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          setNotifications(d.notifications || []);
          setLoading(false);
        });
    }
  }, [user]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const markRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const typeIcon = {
    booking: Bus,
    payment: CreditCard,
    vehicle: Bus,
    traffic: AlertTriangle,
    system: Info,
  };

  const typeColor = {
    booking: "bg-blue-100 text-blue-600",
    payment: "bg-green-100 text-green-600",
    vehicle: "bg-purple-100 text-purple-600",
    traffic: "bg-yellow-100 text-yellow-600",
    system: "bg-gray-100 text-gray-600",
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-500">Please login to view notifications</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-500">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" onClick={markAllRead} className="text-sm">
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const Icon = typeIcon[notif.type as keyof typeof typeIcon] || Info;
            const colorClass = typeColor[notif.type as keyof typeof typeColor] || "bg-gray-100 text-gray-600";

            return (
              <div
                key={notif.id}
                className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-sm ${
                  notif.isRead ? "border-gray-100" : "border-green-200 bg-green-50/30"
                }`}
                onClick={() => !notif.isRead && markRead(notif.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-gray-900 text-sm">
                        {notif.title}
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">{notif.message}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
