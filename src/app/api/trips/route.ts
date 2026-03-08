import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbInsert, dbExecute, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

initializeDatabase();

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    let query = `
      SELECT 
        t.id, t.driver_id, t.vehicle_id, t.route_id,
        t.start_time, t.end_time, t.distance_km,
        t.passengers_count, t.total_revenue, t.status, t.created_at,
        u.name as driver_name, v.plate_number as vehicle_plate, r.name as route_name
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN routes r ON t.route_id = r.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (authUser.role === "driver") {
      conditions.push("t.driver_id = ?");
      params.push(authUser.userId);
    } else if (driverId) {
      conditions.push("t.driver_id = ?");
      params.push(parseInt(driverId));
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY t.created_at DESC";

    const trips = await dbQuery(query, params);
    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Get trips error:", error);
    return NextResponse.json({ error: "Failed to get trips" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "driver") {
      return NextResponse.json({ error: "Only drivers can start trips" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, routeId } = body;

    if (!vehicleId || !routeId) {
      return NextResponse.json(
        { error: "Vehicle and route are required" },
        { status: 400 }
      );
    }

    const tripId = await dbInsert(
      "INSERT INTO trips (driver_id, vehicle_id, route_id, start_time, status) VALUES (?, ?, ?, ?, 'ongoing')",
      [authUser.userId, vehicleId, routeId, new Date().toISOString()]
    );

    // Update vehicle status
    await dbExecute(
      "UPDATE vehicles SET status = 'en_route' WHERE id = ?",
      [vehicleId]
    );

    const trip = await dbGet("SELECT * FROM trips WHERE id = ?", [tripId]);

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json({ error: "Failed to start trip" }, { status: 500 });
  }
}
