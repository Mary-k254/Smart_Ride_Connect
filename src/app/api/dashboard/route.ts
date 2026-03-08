import { NextResponse } from "next/server";
import { dbQuery, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

initializeDatabase();

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Total vehicles
    const vehicleCount = await dbQuery("SELECT COUNT(*) as count FROM vehicles");

    // Active vehicles
    const activeVehicleCount = await dbQuery(
      "SELECT COUNT(*) as count FROM vehicles WHERE status = 'en_route'"
    );

    // Total drivers
    const driverCount = await dbQuery(
      "SELECT COUNT(*) as count FROM users WHERE role = 'driver'"
    );

    // Total passengers
    const passengerCount = await dbQuery(
      "SELECT COUNT(*) as count FROM users WHERE role = 'passenger'"
    );

    // Total trips
    const tripCount = await dbQuery("SELECT COUNT(*) as count FROM trips");

    // Total revenue
    const revenueResult = await dbQuery(
      "SELECT SUM(amount) as total FROM payments WHERE status = 'completed'"
    );

    // Total bookings
    const bookingCount = await dbQuery("SELECT COUNT(*) as count FROM bookings");

    // Average rating
    const avgRating = await dbQuery(
      "SELECT AVG(rating) as avg FROM reviews"
    );

    // Recent trips
    const recentTrips = await dbQuery(`
      SELECT 
        t.id, t.status, t.total_revenue, t.passengers_count, t.start_time, t.end_time,
        u.name as driver_name, v.plate_number as vehicle_plate
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    // Driver performance
    const driverPerformance = await dbQuery(`
      SELECT 
        t.driver_id, u.name as driver_name,
        COUNT(t.id) as total_trips, SUM(t.total_revenue) as total_revenue
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      GROUP BY t.driver_id, u.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    return NextResponse.json({
      stats: {
        totalVehicles: vehicleCount[0]?.count || 0,
        activeVehicles: activeVehicleCount[0]?.count || 0,
        totalDrivers: driverCount[0]?.count || 0,
        totalPassengers: passengerCount[0]?.count || 0,
        totalTrips: tripCount[0]?.count || 0,
        totalRevenue: revenueResult[0]?.total || 0,
        totalBookings: bookingCount[0]?.count || 0,
        averageRating: avgRating[0]?.avg || 0,
      },
      recentTrips,
      driverPerformance,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 });
  }
}
