import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbInsert, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { rateLimitMiddleware, addRateLimitHeaders } from "@/lib/rate-limit";

initializeDatabase();

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get("routeId");

    let query = `
      SELECT 
        v.id, v.plate_number, v.model, v.capacity, v.status,
        v.current_lat, v.current_lng, v.last_location_update, v.is_gps_active,
        v.route_id, v.driver_id, v.sacco_id,
        u.name as driver_name, u.phone as driver_phone,
        r.name as route_name, r.origin as route_origin, r.destination as route_destination,
        s.name as sacco_name
      FROM vehicles v
      LEFT JOIN users u ON v.driver_id = u.id
      LEFT JOIN routes r ON v.route_id = r.id
      LEFT JOIN saccos s ON v.sacco_id = s.id
    `;

    if (routeId) {
      query += ` WHERE v.route_id = ?`;
      const vehicles = await dbQuery(query, [parseInt(routeId)]);
      return addRateLimitHeaders(NextResponse.json({ vehicles }), request);
    }

    const vehicles = await dbQuery(query);
    return addRateLimitHeaders(NextResponse.json({ vehicles }), request);
  } catch (error) {
    console.error("Get vehicles error:", error);
    return NextResponse.json({ error: "Failed to get vehicles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plateNumber, model, capacity, saccoId, driverId, routeId } = body;

    if (!plateNumber || !model) {
      return NextResponse.json(
        { error: "Plate number and model are required" },
        { status: 400 }
      );
    }

    const vehicleId = await dbInsert(
      "INSERT INTO vehicles (plate_number, model, capacity, sacco_id, driver_id, route_id) VALUES (?, ?, ?, ?, ?, ?)",
      [plateNumber, model, capacity || 14, saccoId || null, driverId || null, routeId || null]
    );

    const vehicle = await dbGet("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
