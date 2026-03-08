import { NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";
import { trips, bookings, vehicles, users, payments, reviews } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth";
import { eq, count, sum, avg } from "drizzle-orm";

initializeDatabase();

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Total vehicles
    const [vehicleCount] = await db
      .select({ count: count() })
      .from(vehicles);

    // Active vehicles
    const [activeVehicleCount] = await db
      .select({ count: count() })
      .from(vehicles)
      .where(eq(vehicles.status, "en_route"));

    // Total drivers
    const [driverCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "driver"));

    // Total passengers
    const [passengerCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "passenger"));

    // Total trips
    const [tripCount] = await db
      .select({ count: count() })
      .from(trips);

    // Total revenue
    const [revenueResult] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "completed"));

    // Total bookings
    const [bookingCount] = await db
      .select({ count: count() })
      .from(bookings);

    // Average rating
    const [avgRating] = await db
      .select({ avg: avg(reviews.rating) })
      .from(reviews);

    // Recent trips
    const recentTrips = await db
      .select({
        id: trips.id,
        driverName: users.name,
        vehiclePlate: vehicles.plateNumber,
        status: trips.status,
        totalRevenue: trips.totalRevenue,
        passengersCount: trips.passengersCount,
        startTime: trips.startTime,
        endTime: trips.endTime,
      })
      .from(trips)
      .leftJoin(users, eq(trips.driverId, users.id))
      .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .limit(10);

    // Driver performance
    const driverPerformance = await db
      .select({
        driverId: trips.driverId,
        driverName: users.name,
        totalTrips: count(trips.id),
        totalRevenue: sum(trips.totalRevenue),
      })
      .from(trips)
      .leftJoin(users, eq(trips.driverId, users.id))
      .groupBy(trips.driverId, users.name)
      .limit(10);

    return NextResponse.json({
      stats: {
        totalVehicles: vehicleCount.count,
        activeVehicles: activeVehicleCount.count,
        totalDrivers: driverCount.count,
        totalPassengers: passengerCount.count,
        totalTrips: tripCount.count,
        totalRevenue: revenueResult.total || 0,
        totalBookings: bookingCount.count,
        averageRating: avgRating.avg || 0,
      },
      recentTrips,
      driverPerformance,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 });
  }
}
