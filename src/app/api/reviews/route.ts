import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbInsert, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

initializeDatabase();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    let query = `
      SELECT 
        r.id, r.passenger_id, r.driver_id, r.rating, r.comment, 
        r.is_reported, r.created_at, r.trip_id, r.booking_id,
        u.name as passenger_name
      FROM reviews r
      LEFT JOIN users u ON r.passenger_id = u.id
    `;

    if (driverId) {
      query += ` WHERE r.driver_id = ?`;
      query += ` ORDER BY r.created_at DESC`;
      const reviews = await dbQuery(query, [parseInt(driverId)]);

      // Calculate average rating
      const avgResult = await dbQuery(
        "SELECT AVG(rating) as avg FROM reviews WHERE driver_id = ?",
        [parseInt(driverId)]
      );

      return NextResponse.json({ 
        reviews, 
        averageRating: avgResult[0]?.avg || null 
      });
    }

    query += " ORDER BY r.created_at DESC";
    const reviews = await dbQuery(query);

    return NextResponse.json({ reviews, averageRating: null });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ error: "Failed to get reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "passenger") {
      return NextResponse.json({ error: "Only passengers can leave reviews" }, { status: 401 });
    }

    const body = await request.json();
    const { driverId, tripId, bookingId, rating, comment } = body;

    if (!driverId || !rating) {
      return NextResponse.json(
        { error: "Driver ID and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const reviewId = await dbInsert(
      "INSERT INTO reviews (passenger_id, driver_id, trip_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)",
      [authUser.userId, driverId, tripId || null, bookingId || null, rating, comment || null]
    );

    const review = await dbGet("SELECT * FROM reviews WHERE id = ?", [reviewId]);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
