import { NextRequest, NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";
import { reviews, users } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth";
import { eq, desc, avg } from "drizzle-orm";

initializeDatabase();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    let query = db
      .select({
        id: reviews.id,
        passengerId: reviews.passengerId,
        driverId: reviews.driverId,
        rating: reviews.rating,
        comment: reviews.comment,
        isReported: reviews.isReported,
        createdAt: reviews.createdAt,
        passengerName: users.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.passengerId, users.id))
      .orderBy(desc(reviews.createdAt));

    if (driverId) {
      query = query.where(eq(reviews.driverId, parseInt(driverId))) as typeof query;
    }

    const result = await query;

    // Calculate average rating if driverId provided
    let averageRating = null;
    if (driverId) {
      const avgResult = await db
        .select({ avg: avg(reviews.rating) })
        .from(reviews)
        .where(eq(reviews.driverId, parseInt(driverId)));
      averageRating = avgResult[0]?.avg;
    }

    return NextResponse.json({ reviews: result, averageRating });
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

    const [newReview] = await db
      .insert(reviews)
      .values({
        passengerId: authUser.userId,
        driverId,
        tripId: tripId || null,
        bookingId: bookingId || null,
        rating,
        comment: comment || null,
      })
      .returning();

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
