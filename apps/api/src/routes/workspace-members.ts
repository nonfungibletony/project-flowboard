import { Router, Request, Response } from "express";
import { CreateWorkspaceMemberSchema } from "@group/shared";
import { db, schema } from "@group/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

async function assertWorkspaceOwner(workspaceId: string, userId: string) {
  const ws = await db
    .select()
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.createdBy, userId)))
    .limit(1);
  return ws[0] ?? null;
}

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
  // Owner or member
  const owner = await assertWorkspaceOwner(workspaceId, userId);
  if (owner) return true;
  const member = await db
    .select()
    .from(schema.workspaceMembers)
    .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.workspaceMembers.userId, userId)))
    .limit(1);
  return member.length > 0;
}

// GET /api/workspaces/:id/members
router.get("/", async (req: Request, res: Response) => {
  const workspaceId = req.params.id;
  const hasAccess = await assertWorkspaceAccess(workspaceId, req.user!.id);
  if (!hasAccess) return res.status(404).json({ success: false, message: "Workspace not found" });

  const members = await db
    .select()
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

  const membersWithUsers = await Promise.all(
    members.map(async (m) => {
      const user = await db.select().from(schema.users).where(eq(schema.users.id, m.userId)).limit(1);
      return {
        id: m.id,
        userId: m.userId,
        name: user[0]?.name || "Unknown",
        email: user[0]?.email || "",
        role: m.role,
        createdAt: m.createdAt,
      };
    })
  );
  res.json({ success: true, data: membersWithUsers });
});

// POST /api/workspaces/:id/members
router.post("/", async (req: Request, res: Response) => {
  const workspaceId = req.params.id;
  const owner = await assertWorkspaceOwner(workspaceId, req.user!.id);
  if (!owner) return res.status(403).json({ success: false, message: "Only workspace owner can add members" });

  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ success: false, message: "email is required" });
  }

  const user = await db.select().from(schema.users).where(eq(schema.users.email, email.trim())).limit(1);
  if (!user.length) {
    return res.status(404).json({ success: false, message: "User not found — they must sign in first" });
  }

  const userId = user[0].id;

  // Idempotency: if already a member, return existing
  const existing = await db
    .select()
    .from(schema.workspaceMembers)
    .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.workspaceMembers.userId, userId)))
    .limit(1);

  if (existing.length) {
    return res.status(200).json({ success: true, data: { id: existing[0].id, userId, name: user[0].name, email: user[0].email, role: existing[0].role, createdAt: existing[0].createdAt } });
  }

  const parsed = CreateWorkspaceMemberSchema.safeParse({ workspaceId, userId, role: "member" });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }

  const inserted = await db.insert(schema.workspaceMembers).values(parsed.data).returning();
  res.status(201).json({
    success: true,
    data: { id: inserted[0].id, userId, name: user[0].name, email: user[0].email, role: inserted[0].role, createdAt: inserted[0].createdAt },
  });
});

// DELETE /api/workspaces/:id/members/:memberId
router.delete("/:memberId", async (req: Request, res: Response) => {
  const workspaceId = req.params.id;
  const owner = await assertWorkspaceOwner(workspaceId, req.user!.id);
  if (!owner) return res.status(403).json({ success: false, message: "Only workspace owner can remove members" });

  const member = await db
    .select()
    .from(schema.workspaceMembers)
    .where(and(eq(schema.workspaceMembers.id, req.params.memberId), eq(schema.workspaceMembers.workspaceId, workspaceId)))
    .limit(1);
  if (!member.length) return res.status(404).json({ success: false, message: "Member not found" });

  await db.delete(schema.workspaceMembers).where(eq(schema.workspaceMembers.id, req.params.memberId));
  res.json({ success: true });
});

export { router as workspaceMemberRoutes };
