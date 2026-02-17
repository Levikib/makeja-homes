import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.log("❌ No token found in getCurrentUser");
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.users.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      console.log("❌ User not found in database");
      return null;
    }

    console.log(`✅ getCurrentUser success: ${user.email} (${user.role})`);
    return user;
  } catch (error) {
    console.error("❌ Error in getCurrentUser:", error);
    return null;
  }
}
