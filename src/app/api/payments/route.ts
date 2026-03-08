import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbInsert, dbExecute, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateTransactionId } from "@/lib/utils";

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
    const booking = await dbGet(
      "SELECT * FROM bookings WHERE id = ?",
      [bookingId]
    );

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.payment_status === "paid") {
      return NextResponse.json({ error: "Booking already paid" }, { status: 400 });
    }

    const transactionId = generateTransactionId();

    // Simulate payment processing (in production, integrate with M-Pesa API)
    const paymentSuccess = true; // Simulated success

    if (paymentSuccess) {
      const receipt = `RECEIPT-${transactionId}`;

      // Insert payment
      const paymentId = await dbInsert(
        `INSERT INTO payments (booking_id, passenger_id, amount, method, transaction_id, status, phone_number, receipt)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [bookingId, authUser.userId, booking.fare_amount, method, transactionId, phoneNumber || null, receipt]
      );

      // Update booking payment status
      await dbExecute(
        "UPDATE bookings SET payment_status = 'paid', payment_method = ?, status = 'confirmed' WHERE id = ?",
        [method, bookingId]
      );

      // Create notification
      await dbInsert(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [authUser.userId, "Payment Successful", `Payment of KES ${booking.fare_amount} received. Transaction ID: ${transactionId}`, "payment"]
      );

      const payment = await dbGet("SELECT * FROM payments WHERE id = ?", [paymentId]);

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

    const payments = await dbQuery(
      "SELECT * FROM payments WHERE passenger_id = ?",
      [authUser.userId]
    );

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Failed to get payments" }, { status: 500 });
  }
}
