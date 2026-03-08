import { NextRequest, NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";
import { payments, bookings, notifications } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth";
import { generateTransactionId } from "@/lib/utils";
import { eq } from "drizzle-orm";

initializeDatabase();

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, method, phoneNumber } = body;

    if (!bookingId || !method) {
      return NextResponse.json(
        { error: "Booking ID and payment method are required" },
        { status: 400 }
      );
    }

    // Get booking
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ error: "Booking already paid" }, { status: 400 });
    }

    const transactionId = generateTransactionId();

    // Simulate payment processing (in production, integrate with M-Pesa API)
    const paymentSuccess = true; // Simulated success

    if (paymentSuccess) {
      const receipt = `RECEIPT-${transactionId}`;

      const [payment] = await db
        .insert(payments)
        .values({
          bookingId,
          passengerId: authUser.userId,
          amount: booking.fareAmount,
          method,
          transactionId,
          status: "completed",
          phoneNumber: phoneNumber || null,
          receipt,
        })
        .returning();

      // Update booking payment status
      await db
        .update(bookings)
        .set({
          paymentStatus: "paid",
          paymentMethod: method,
          status: "confirmed",
        })
        .where(eq(bookings.id, bookingId));

      // Create notification
      await db.insert(notifications).values({
        userId: authUser.userId,
        title: "Payment Successful",
        message: `Payment of KES ${booking.fareAmount} received. Transaction ID: ${transactionId}`,
        type: "payment",
      });

      return NextResponse.json({
        success: true,
        payment,
        receipt,
        transactionId,
      });
    } else {
      return NextResponse.json({ error: "Payment failed" }, { status: 400 });
    }
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select()
      .from(payments)
      .where(eq(payments.passengerId, authUser.userId));

    return NextResponse.json({ payments: result });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Failed to get payments" }, { status: 500 });
  }
}
