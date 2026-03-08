import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import * as schema from "./schema";

// Create the database connection using Vercel Postgres
export const db = drizzle(sql, { schema });

// Initialize tables
export async function initializeDatabase() {
  // Create tables if they don't exist
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'passenger',
      profile_image TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS saccos (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      registration_number TEXT UNIQUE NOT NULL,
      manager_id INTEGER REFERENCES users(id),
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      distance_km REAL NOT NULL,
      base_fare_per_km REAL NOT NULL DEFAULT 10,
      estimated_duration_min INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      plate_number TEXT UNIQUE NOT NULL,
      model TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 14,
      sacco_id INTEGER REFERENCES saccos(id),
      driver_id INTEGER REFERENCES users(id),
      route_id INTEGER REFERENCES routes(id),
      current_lat REAL,
      current_lng REAL,
      status TEXT DEFAULT 'inactive',
      last_location_update TIMESTAMP WITH TIME ZONE,
      is_gps_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL REFERENCES users(id),
      vehicle_id INTEGER REFERENCES vehicles(id),
      route_id INTEGER NOT NULL REFERENCES routes(id),
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      pickup_address TEXT,
      dropoff_lat REAL NOT NULL,
      dropoff_lng REAL NOT NULL,
      dropoff_address TEXT,
      distance_km REAL NOT NULL,
      fare_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      payment_method TEXT,
      seat_number INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      driver_id INTEGER NOT NULL REFERENCES users(id),
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      route_id INTEGER NOT NULL REFERENCES routes(id),
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      distance_km REAL,
      passengers_count INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      status TEXT DEFAULT 'ongoing',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      passenger_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      transaction_id TEXT UNIQUE,
      status TEXT DEFAULT 'pending',
      phone_number TEXT,
      receipt TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL REFERENCES users(id),
      driver_id INTEGER NOT NULL REFERENCES users(id),
      trip_id INTEGER REFERENCES trips(id),
      booking_id INTEGER REFERENCES bookings(id),
      rating INTEGER NOT NULL,
      comment TEXT,
      is_reported BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS traffic_alerts (
      id SERIAL PRIMARY KEY,
      route_id INTEGER REFERENCES routes(id),
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT DEFAULT 'medium',
      lat REAL,
      lng REAL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE
    );
  `;

  // Seed initial data
  await seedInitialData();
}

async function seedInitialData() {
  // Check if routes already exist
  const result = await sql`SELECT COUNT(*) as count FROM routes`;
  const count = Number(result.rows[0]?.count || 0);
  if (count > 0) return;

  // Seed routes (major Kenyan matatu routes)
  await sql`
    INSERT INTO routes (name, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng, distance_km, base_fare_per_km, estimated_duration_min) VALUES
    ('Nairobi - Mombasa', 'Nairobi CBD', 'Mombasa', -1.2921, 36.8219, -4.0435, 39.6682, 480, 1.5, 480),
    ('Nairobi - Kisumu', 'Nairobi CBD', 'Kisumu', -1.2921, 36.8219, -0.0917, 34.7680, 350, 1.5, 360),
    ('Nairobi - Nakuru', 'Nairobi CBD', 'Nakuru', -1.2921, 36.8219, -0.3031, 36.0800, 160, 1.5, 120),
    ('Nairobi - Eldoret', 'Nairobi CBD', 'Eldoret', -1.2921, 36.8219, 0.5143, 35.2698, 310, 1.5, 300),
    ('Nairobi - Thika', 'Nairobi CBD', 'Thika', -1.2921, 36.8219, -1.0332, 37.0693, 45, 1.5, 60),
    ('Nairobi - Machakos', 'Nairobi CBD', 'Machakos', -1.2921, 36.8219, -1.5177, 37.2634, 65, 1.5, 75),
    ('Nairobi - Nyeri', 'Nairobi CBD', 'Nyeri', -1.2921, 36.8219, -0.4167, 36.9500, 155, 1.5, 150),
    ('Mombasa - Malindi', 'Mombasa', 'Malindi', -4.0435, 39.6682, -3.2138, 40.1169, 120, 1.5, 120);
  `;

  // Seed saccos
  await sql`
    INSERT INTO saccos (name, registration_number, phone, email, address) VALUES
    ('Modern Coast Express', 'SACCO001', '+254700000001', 'info@moderncoast.co.ke', 'Nairobi CBD'),
    ('Easy Coach', 'SACCO002', '+254700000002', 'info@easycoach.co.ke', 'Nairobi CBD'),
    ('Mash Poa', 'SACCO003', '+254700000003', 'info@mashpoa.co.ke', 'Nairobi CBD'),
    ('Guardian Angel', 'SACCO004', '+254700000004', 'info@guardian.co.ke', 'Mombasa');
  `;

  // Seed traffic alerts
  await sql`
    INSERT INTO traffic_alerts (route_id, title, description, severity, lat, lng) VALUES
    (1, 'Heavy Traffic at Mlolongo', 'Expect delays of 30-45 minutes near Mlolongo junction', 'high', -1.3500, 36.9000),
    (2, 'Road Works at Mai Mahiu', 'Single lane traffic due to road construction', 'medium', -0.9833, 36.5167),
    (3, 'Normal Traffic', 'Traffic flowing smoothly on Nakuru highway', 'low', -0.8000, 36.4000);
  `;
}
