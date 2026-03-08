import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbExecute, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

initializeDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicle = await dbGet(
      "SELECT * FROM vehicles WHERE id = ?",
      [parseInt(id)]
    );

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plate_number,
        currentLat: vehicle.current_lat,
        currentLng: vehicle.current_lng,
        lastLocationUpdate: vehicle.last_location_update,
        isGpsActive: vehicle.is_gps_active,
        status: vehicle.status,
      },
    });
  } catch (error) {
    console.error("Get vehicle location error:", error);
    return NextResponse.json({ error: "Failed to get location" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "driver") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { latitude, longitude } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Check if this vehicle belongs to the driver
    const vehicle = await dbGet(
      "SELECT * FROM vehicles WHERE id = ? AND driver_id = ?",
      [parseInt(id), authUser.userId]
    );

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found or not assigned to you" },
        { status: 404 }
      );
    }

    // Update location
    await dbExecute(
      "UPDATE vehicles SET current_lat = ?, current_lng = ?, last_location_update = CURRENT_TIMESTAMP, is_gps_active = 1 WHERE id = ?",
      [latitude, longitude, parseInt(id)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update vehicle location error:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
