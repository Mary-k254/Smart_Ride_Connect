"use client";

import { useEffect, useRef } from "react";

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

interface VehicleMapProps {
  vehicles: Vehicle[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  height?: string;
}

export function VehicleMap({
  vehicles,
  centerLat = -1.2921,
  centerLng = 36.8219,
  zoom = 7,
  height = "400px",
}: VehicleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      // Fix default icon issue with Leaflet's internal property
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      // Remove existing map
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
      }

      const map = L.map(mapRef.current).setView([centerLat, centerLng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Bus icon
      const busIcon = L.divIcon({
        html: `<div style="background:#16a34a;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">🚌</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Add vehicle markers
      vehicles.forEach((vehicle) => {
        if (vehicle.currentLat && vehicle.currentLng) {
          const marker = L.marker([vehicle.currentLat, vehicle.currentLng], {
            icon: busIcon,
          }).addTo(map);

          marker.bindPopup(`
            <div style="min-width:160px">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px">🚌 ${vehicle.plateNumber}</div>
              <div style="color:#666;font-size:12px">${vehicle.model}</div>
              ${vehicle.driverName ? `<div style="color:#666;font-size:12px">Driver: ${vehicle.driverName}</div>` : ""}
              ${vehicle.routeName ? `<div style="color:#16a34a;font-size:12px;margin-top:4px">📍 ${vehicle.routeName}</div>` : ""}
              <div style="margin-top:4px">
                <span style="background:${vehicle.status === "en_route" ? "#dcfce7" : "#f3f4f6"};color:${vehicle.status === "en_route" ? "#16a34a" : "#6b7280"};padding:2px 8px;border-radius:9999px;font-size:11px">
                  ${vehicle.status.replace("_", " ")}
                </span>
              </div>
            </div>
          `);
        }
      });

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [vehicles, centerLat, centerLng, zoom]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "12px", overflow: "hidden" }}
    />
  );
}
