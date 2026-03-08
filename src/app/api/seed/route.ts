import { NextResponse } from "next/server";
import { dbQuery, dbGet, dbInsert, dbExecute, initializeDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

initializeDatabase();

export async function POST() {
  try {
    // Check if demo accounts already exist
    const existingUser = await dbGet(
      "SELECT id FROM users WHERE email = ?",
      ["passenger@demo.com"]
    );

    if (existingUser) {
      return NextResponse.json({ message: "Demo accounts already exist" });
    }

    const hashedPassword = await hashPassword("demo123");

    // Create demo users
    const passengerId = await dbInsert(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      ["Jane Wanjiku", "passenger@demo.com", "+254700000010", hashedPassword, "passenger"]
    );

    const driverId = await dbInsert(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      ["John Kamau", "driver@demo.com", "+254700000011", hashedPassword, "driver"]
    );

    const managerId = await dbInsert(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      ["Peter Ochieng", "manager@demo.com", "+254700000012", hashedPassword, "manager"]
    );

    // Get first SACCO
    const sacco = await dbGet("SELECT id FROM saccos LIMIT 1");

    // Update SACCO manager
    if (sacco) {
      await dbExecute(
        "UPDATE saccos SET manager_id = ? WHERE id = ?",
        [managerId, sacco.id]
      );
    }

    // Create demo vehicles
    await dbInsert(
      `INSERT INTO vehicles (plate_number, model, capacity, sacco_id, driver_id, route_id, 
        current_lat, current_lng, status, is_gps_active, last_location_update) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["KCA 123A", "Toyota Hiace", 14, sacco?.id || null, driverId, 1, -1.2921, 36.8219, "en_route", 1, new Date().toISOString()]
    );

    await dbInsert(
      `INSERT INTO vehicles (plate_number, model, capacity, sacco_id, driver_id, route_id, 
        current_lat, current_lng, status, is_gps_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["KCB 456B", "Isuzu NQR", 33, sacco?.id || null, null, 2, -0.5, 36.5, "active", 0]
    );

    await dbInsert(
      `INSERT INTO vehicles (plate_number, model, capacity, sacco_id, route_id, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["KCC 789C", "Toyota Coaster", 29, sacco?.id || null, 3, "inactive"]
    );

    return NextResponse.json({
      success: true,
      message: "Demo accounts created successfully",
      accounts: {
        passenger: { email: "passenger@demo.com", password: "demo123" },
        driver: { email: "driver@demo.com", password: "demo123" },
        manager: { email: "manager@demo.com", password: "demo123" },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}
