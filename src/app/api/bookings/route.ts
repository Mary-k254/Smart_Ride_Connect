import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbInsert, dbExecute, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { rateLimitMiddleware, addRateLimitHeaders } from "@/lib/rate-limit";
import { calculateDistance, calculateFare } from "@/lib/utils";

initializeDatabase();

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = `
      SELECT 
        b.id, b.passenger_id, b.vehicle_id, b.route_id,
        b.pickup_lat, b.pickup_lng, b.pickup_address,
        b.dropoff_lat, b.dropoff_lng, b.dropoff_address,
        b.distance_km, b.fare_amount, b.status, b.payment_status,
        b.payment_method, b.seat_number, b.created_at,
        r.name as route_name, r.origin as route_origin, r.destination as route_destination,
        v.plate_number as vehicle_plate, v.model as vehicle_model
      FROM bookings b
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (authUser.role === "passenger") {
      conditions.push("b.passenger_id = ?");
      params.push(authUser.userId);
    }

    if (status) {
      conditions.push("b.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY b.created_at DESC";

    const bookings = await dbQuery(query, params);
    return addRateLimitHeaders(NextResponse.json({ bookings }), request);
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json({ error: "Failed to get bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "passenger") {
      return NextResponse.json({ error: "Only passengers can make bookings" }, { status: 401 });
    }

    const body = await request.json();
    const {
      routeId,
      vehicleId,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropoffLat,
      dropoffLng,
      dropoffAddress,
    } = body;

    if (!routeId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return NextResponse.json(
        { error: "Route, pickup and dropoff locations are required" },
        { status: 400 }
      );
    }

    // Get route for fare calculation
    const route = await dbGet(
      "SELECT * FROM routes WHERE id = ?",
      [routeId]
    );

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const distanceKm = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const fareAmount = calculateFare(distanceKm, route.base_fare_per_km);

    // Get next available seat
    const existingBookings = vehicleId 
      ? await dbQuery(
          "SELECT seat_number FROM bookings WHERE vehicle_id = ?",
          [vehicleId]
        )
      : [];

    const usedSeats = existingBookings.map((b: any) => b.seat_number).filter(Boolean);
    let seatNumber = 1;
    while (usedSeats.includes(seatNumber)) seatNumber++;

    // Insert booking
    const bookingId = await dbInsert(
      `INSERT INTO bookings (passenger_id, vehicle_id, route_id, pickup_lat, pickup_lng, 
        pickup_address, dropoff_lat, dropoff_lng, dropoff_address, distance_km, 
        fare_amount, seat_number, status, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')`,
      [authUser.userId, vehicleId || null, routeId, pickupLat, pickupLng, 
       pickupAddress || null, dropoffLat, dropoffLng, dropoffAddress || null, 
       distanceKm, fareAmount, seatNumber]
    );

    // Create notification
    await dbInsert(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
      [authUser.userId, "Booking Confirmed", `Your booking on ${route.name} has been created. Fare: KES ${fareAmount}`, "booking"]
    );

    const newBooking = await dbGet("SELECT * FROM bookings WHERE id = ?", [bookingId]);

    return addRateLimitHeaders(NextResponse.json({ booking: newBooking }, { status: 201 }), request);
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
