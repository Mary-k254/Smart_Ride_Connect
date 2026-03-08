import { sql } from "drizzle-orm";
import {
  integer,
  real,
  pgTable,
  text,
  boolean,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["passenger", "driver", "manager"] })
    .notNull()
    .default("passenger"),
  profileImage: text("profile_image"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SACCOs table
export const saccos = pgTable("saccos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").unique().notNull(),
  managerId: integer("manager_id").references(() => users.id),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Routes table
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  originLat: real("origin_lat").notNull(),
  originLng: real("origin_lng").notNull(),
  destLat: real("dest_lat").notNull(),
  destLng: real("dest_lng").notNull(),
  distanceKm: real("distance_km").notNull(),
  baseFarePerKm: real("base_fare_per_km").notNull().default(10),
  estimatedDurationMin: integer("estimated_duration_min"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plateNumber: text("plate_number").unique().notNull(),
  model: text("model").notNull(),
  capacity: integer("capacity").notNull().default(14),
  saccoId: integer("sacco_id").references(() => saccos.id),
  driverId: integer("driver_id").references(() => users.id),
  routeId: integer("route_id").references(() => routes.id),
  currentLat: real("current_lat"),
  currentLng: real("current_lng"),
  status: text("status", { enum: ["active", "inactive", "maintenance", "en_route"] })
    .default("inactive"),
  lastLocationUpdate: timestamp("last_location_update"),
  isGpsActive: boolean("is_gps_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id")
    .references(() => users.id)
    .notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  pickupLat: real("pickup_lat").notNull(),
  pickupLng: real("pickup_lng").notNull(),
  pickupAddress: text("pickup_address"),
  dropoffLat: real("dropoff_lat").notNull(),
  dropoffLng: real("dropoff_lng").notNull(),
  dropoffAddress: text("dropoff_address"),
  distanceKm: real("distance_km").notNull(),
  fareAmount: real("fare_amount").notNull(),
  status: text("status", {
    enum: ["pending", "confirmed", "picked_up", "completed", "cancelled"],
  }).default("pending"),
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "paid", "refunded"],
  }).default("unpaid"),
  paymentMethod: text("payment_method"),
  seatNumber: integer("seat_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trips table
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  distanceKm: real("distance_km"),
  passengersCount: integer("passengers_count").default(0),
  totalRevenue: real("total_revenue").default(0),
  status: text("status", { enum: ["ongoing", "completed", "cancelled"] })
    .default("ongoing"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  passengerId: integer("passenger_id")
    .references(() => users.id)
    .notNull(),
  amount: real("amount").notNull(),
  method: text("method", { enum: ["mpesa", "card", "cash"] }).notNull(),
  transactionId: text("transaction_id").unique(),
  status: text("status", {
    enum: ["pending", "completed", "failed", "refunded"],
  }).default("pending"),
  phoneNumber: text("phone_number"),
  receipt: text("receipt"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id")
    .references(() => users.id)
    .notNull(),
  driverId: integer("driver_id")
    .references(() => users.id)
    .notNull(),
  tripId: integer("trip_id").references(() => trips.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  isReported: boolean("is_reported").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", {
    enum: ["booking", "payment", "vehicle", "traffic", "system"],
  }).notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Traffic alerts table
export const trafficAlerts = pgTable("traffic_alerts", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity", { enum: ["low", "medium", "high"] }).default(
    "medium"
  ),
  lat: real("lat"),
  lng: real("lng"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Sacco = typeof saccos.$inferSelect;
export type TrafficAlert = typeof trafficAlerts.$inferSelect;
