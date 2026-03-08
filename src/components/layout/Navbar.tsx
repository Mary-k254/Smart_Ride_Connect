"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import {
  Bus,
  Bell,
  Menu,
  X,
  User,
  LogOut,
  MapPin,
  BookOpen,
  LayoutDashboard,
  Navigation,
  Star,
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setNotifCount(d.unreadCount || 0))
        .catch(() => {});
    }
  }, [user]);

  const passengerLinks = [
    { href: "/routes", label: "Routes", icon: MapPin },
    { href: "/booking", label: "Book Seat", icon: BookOpen },
    { href: "/tracking", label: "Track Vehicle", icon: Navigation },
    { href: "/reviews", label: "Reviews", icon: Star },
  ];

  const driverLinks = [
    { href: "/driver", label: "Dashboard", icon: LayoutDashboard },
    { href: "/driver/trips", label: "My Trips", icon: Navigation },
  ];

  const managerLinks = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manager/vehicles", label: "Vehicles", icon: Bus },
    { href: "/manager/drivers", label: "Drivers", icon: User },
  ];

  const links =
    user?.role === "driver"
      ? driverLinks
      : user?.role === "manager"
      ? managerLinks
      : passengerLinks;

  return (
    <nav className="bg-green-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Bus className="h-7 w-7 text-yellow-300" />
            <span className="hidden sm:block">MatatuConnect</span>
            <span className="sm:hidden">MC</span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Link>

                {/* Profile */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <div className="h-7 w-7 bg-yellow-400 rounded-full flex items-center justify-center text-green-900 font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block">{user.name.split(" ")[0]}</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-green-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>

                {/* Mobile menu toggle */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-green-600"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium hover:bg-green-600 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-yellow-400 text-green-900 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="md:hidden pb-3 border-t border-green-600 mt-1 pt-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
