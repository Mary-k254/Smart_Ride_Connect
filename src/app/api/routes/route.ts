import { NextResponse } from "next/server";
import { dbQuery, initializeDatabase } from "@/lib/db";

initializeDatabase();

export async function GET() {
  try {
    const allRoutes = await dbQuery(
      "SELECT * FROM routes WHERE is_active = 1"
    );

    // Get vehicle counts per route
    const routesWithVehicles = await Promise.all(
      allRoutes.map(async (route: any) => {
        const vehicleList = await dbQuery(
          `SELECT v.id, v.plate_number, v.model, v.capacity, v.status, 
                  v.current_lat, v.current_lng, u.name as driver_name
           FROM vehicles v
           LEFT JOIN users u ON v.driver_id = u.id
           WHERE v.route_id = ?`,
          [route.id]
        );

        return {
          ...route,
          vehicles: vehicleList,
          activeVehicles: vehicleList.filter((v: any) => v.status === "en_route" || v.status === "active").length,
        };
      })
    );

    return NextResponse.json({ routes: routesWithVehicles });
  } catch (error) {
    console.error("Get routes error:", error);
    return NextResponse.json({ error: "Failed to get routes" }, { status: 500 });
  }
}
