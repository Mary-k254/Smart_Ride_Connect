import { NextResponse } from "next/server";
import { dbQuery, initializeDatabase } from "@/lib/db";

initializeDatabase();

export async function GET() {
  try {
    const alerts = await dbQuery(`
      SELECT 
        t.id, t.route_id, t.title, t.description, t.severity, 
        t.lat, t.lng, t.is_active, t.created_at, t.expires_at,
        r.name as route_name
      FROM traffic_alerts t
      LEFT JOIN routes r ON t.route_id = r.id
      WHERE t.is_active = 1
    `);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Get traffic alerts error:", error);
    return NextResponse.json({ error: "Failed to get traffic alerts" }, { status: 500 });
  }
}
