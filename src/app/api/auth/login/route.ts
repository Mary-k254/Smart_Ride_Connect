import { NextRequest, NextResponse } from "next/server";
import { dbGet, initializeDatabase } from "@/lib/db";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { rateLimitMiddleware, addRateLimitHeaders } from "@/lib/rate-limit";

initializeDatabase();

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();
    const { identifier, password } = body; // identifier = email or phone

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/phone and password are required" },
        { status: 400 }
      );
    }

    // Find user by email or phone
    const user = await dbGet(
      "SELECT id, name, email, phone, password, role, is_active FROM users WHERE email = ? OR phone = ?",
      [identifier, identifier]
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "Account is deactivated. Contact support." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role as "passenger" | "driver" | "manager",
      name: user.name,
    });

    const cookieOptions = setAuthCookie(token);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    });

    response.cookies.set(cookieOptions);
    return addRateLimitHeaders(response, request);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
