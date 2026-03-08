import { NextRequest, NextResponse } from "next/server";
import { dbQuery, dbGet, dbExecute, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

initializeDatabase();

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await dbQuery(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [authUser.userId]
    );

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Failed to get notifications" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (notificationId) {
      await dbExecute(
        "UPDATE notifications SET is_read = 1 WHERE id = ?",
        [notificationId]
      );
    } else {
      // Mark all as read
      await dbExecute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
        [authUser.userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
