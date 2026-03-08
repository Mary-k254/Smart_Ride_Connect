import { NextRequest, NextResponse } from "next/server";
import { dbGet, initializeDatabase } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

initializeDatabase();

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get full user details
    const user = await dbGet(
      "SELECT id, name, email, phone, role, profile_image, is_active, created_at FROM users WHERE id = ?",
      [authUser.userId]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profile_image,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, profileImage } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      params.push(phone);
    }
    if (profileImage !== undefined) {
      updates.push("profile_image = ?");
      params.push(profileImage);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(authUser.userId);

    await dbGet(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    // Get updated user
    const user = await dbGet(
      "SELECT id, name, email, phone, role, profile_image, is_active, created_at FROM users WHERE id = ?",
      [authUser.userId]
    );

    return NextResponse.json({
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        phone: user!.phone,
        role: user!.role,
        profileImage: user!.profile_image,
        isActive: user!.is_active,
        createdAt: user!.created_at,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
