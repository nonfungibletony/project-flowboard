import { Router, Request, Response } from "express";
import { CreateUserSchema, UpdateUserSchema } from "@group/shared";
import { db, schema } from "@group/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req: Request, res: Response) => {
  const users = await db.select().from(schema.users);
  res.json({ success: true, data: users });
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.users).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

router.get("/:id", async (req: Request, res: Response) => {
  const user = await db.select().from(schema.users).where(eq(schema.users.id, req.params.id));
  if (!user.length) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: user[0] });
});

router.patch("/:id", async (req: Request, res: Response) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const updated = await db.update(schema.users).set(parsed.data).where(eq(schema.users.id, req.params.id)).returning();
  res.json({ success: true, data: updated[0] });
});

export { router as userRoutes };
