import { Router, Request, Response } from "express";
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from "@group/shared";
import { db, schema } from "@group/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// GET /api/workspaces
router.get("/", async (req: Request, res: Response) => {
  const workspaces = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.createdBy, req.user!.id));
  res.json({ success: true, data: workspaces });
});

// POST /api/workspaces
router.post("/", async (req: Request, res: Response) => {
  const raw = req.body;
  if (!raw?.name || typeof raw.name !== "string" || !raw.name.trim()) {
    return res.status(400).json({ success: false, message: "name is required" });
  }
  const slug =
    raw.slug?.trim() ||
    raw.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 200);

  if (!slug) {
    return res.status(400).json({ success: false, message: "slug could not be generated" });
  }

  const parsed = CreateWorkspaceSchema.safeParse({ ...raw, name: raw.name.trim(), slug });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }

  const createdBy = req.user!.id;

  try {
    const inserted = await db
      .insert(schema.workspaces)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        createdBy,
      })
      .returning();
    res.status(201).json({ success: true, data: inserted[0] });
  } catch (err: any) {
    if (err?.message?.includes("unique constraint") || err?.code === "23505") {
      return res.status(409).json({ success: false, message: "Slug already taken" });
    }
    throw err;
  }
});

// GET /api/workspaces/:id
router.get("/:id", async (req: Request, res: Response) => {
  const ws = await db
    .select()
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.id, req.params.id), eq(schema.workspaces.createdBy, req.user!.id)))
    .limit(1);
  if (!ws.length) return res.status(404).json({ success: false, message: "Workspace not found" });
  res.json({ success: true, data: ws[0] });
});

// GET /api/workspaces/:id/boards
router.get("/:id/boards", async (req: Request, res: Response) => {
  const ws = await db
    .select()
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.id, req.params.id), eq(schema.workspaces.createdBy, req.user!.id)))
    .limit(1);
  if (!ws.length) return res.status(404).json({ success: false, message: "Workspace not found" });

  const boards = await db
    .select()
    .from(schema.boards)
    .where(and(eq(schema.boards.workspaceId, req.params.id), eq(schema.boards.createdBy, req.user!.id)));
  res.json({ success: true, data: boards });
});

// PATCH /api/workspaces/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const existing = await db
    .select()
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.id, req.params.id), eq(schema.workspaces.createdBy, req.user!.id)))
    .limit(1);
  if (!existing.length) return res.status(404).json({ success: false, message: "Workspace not found" });

  const parsed = UpdateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }

  try {
    const updated = await db
      .update(schema.workspaces)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.workspaces.id, req.params.id))
      .returning();
    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    if (err?.message?.includes("unique constraint") || err?.code === "23505") {
      return res.status(409).json({ success: false, message: "Slug already taken" });
    }
    throw err;
  }
});

// DELETE /api/workspaces/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await db
    .select()
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.id, req.params.id), eq(schema.workspaces.createdBy, req.user!.id)))
    .limit(1);
  if (!existing.length) return res.status(404).json({ success: false, message: "Workspace not found" });

  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, req.params.id));
  res.json({ success: true });
});

export { router as workspaceRoutes };
