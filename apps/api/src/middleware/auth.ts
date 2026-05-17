import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import { db, schema } from "@group/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkUserId: string;
        email: string;
        name: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set");
    return res.status(500).json({ success: false, message: "Server misconfiguration" });
  }

  try {
    const jwt = await verifyToken(token, { secretKey });
    const clerkUserId = jwt.sub as string;
    const email = (jwt.email as string) || "";
    const name = (jwt.name as string) || (jwt.given_name as string) || (jwt.username as string) || email.split("@")[0];

    // Sync user to local DB
    let user = await db.select().from(schema.users).where(eq(schema.users.clerkUserId, clerkUserId)).limit(1);

    if (!user.length) {
      const inserted = await db
        .insert(schema.users)
        .values({ clerkUserId, email, name })
        .returning();
      user = inserted;
    } else {
      // Update name/email if changed
      await db
        .update(schema.users)
        .set({ email, name })
        .where(eq(schema.users.id, user[0].id));
    }

    req.user = {
      id: user[0].id,
      clerkUserId,
      email,
      name,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
