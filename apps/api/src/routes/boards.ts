import { Router, Request, Response } from "express";
import { CreateBoardSchema, UpdateBoardSchema, CreateColumnSchema, CreateCardSchema, UpdateCardSchema, CreateCommentSchema } from "@group/shared";
import { db, schema } from "@group/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Boards
router.get("/", async (_req: Request, res: Response) => {
  const boards = await db.select().from(schema.boards);
  res.json({ success: true, data: boards });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateBoardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.boards).values({
    ...parsed.data,
    createdBy: req.user!.id,
  }).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

router.get("/:id", async (req: Request, res: Response) => {
  const board = await db.select().from(schema.boards).where(eq(schema.boards.id, req.params.id));
  if (!board.length) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true, data: board[0] });
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateBoardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const board = await db.select().from(schema.boards).where(eq(schema.boards.id, req.params.id)).limit(1);
  if (!board.length) return res.status(404).json({ success: false, message: "Board not found" });
  if (board[0].createdBy !== req.user!.id) {
    return res.status(403).json({ success: false, message: "Forbidden: not the board owner" });
  }
  const updated = await db.update(schema.boards).set(parsed.data).where(eq(schema.boards.id, req.params.id)).returning();
  res.json({ success: true, data: updated[0] });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const board = await db.select().from(schema.boards).where(eq(schema.boards.id, req.params.id)).limit(1);
  if (!board.length) return res.status(404).json({ success: false, message: "Board not found" });
  if (board[0].createdBy !== req.user!.id) {
    return res.status(403).json({ success: false, message: "Forbidden: not the board owner" });
  }
  await db.delete(schema.boards).where(eq(schema.boards.id, req.params.id));
  res.json({ success: true });
});

// Columns
router.get("/:id/columns", async (req: Request, res: Response) => {
  const cols = await db.select().from(schema.columns).where(eq(schema.columns.boardId, req.params.id));
  const colsWithCards = await Promise.all(
    cols.map(async (col) => {
      const cards = await db.select().from(schema.cards).where(eq(schema.cards.columnId, col.id));
      return { ...col, cards };
    })
  );
  res.json({ success: true, data: colsWithCards });
});

router.post("/:id/columns", requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateColumnSchema.safeParse({ ...req.body, boardId: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.columns).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

// Card routes via column
router.post("/columns/:columnId/cards", requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateCardSchema.safeParse({ ...req.body, columnId: req.params.columnId });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.cards).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

router.patch("/cards/:cardId/move", requireAuth, async (req: Request, res: Response) => {
  const { columnId } = req.body;
  if (!columnId) return res.status(400).json({ success: false, message: "columnId required" });
  const updated = await db.update(schema.cards).set({ columnId }).where(eq(schema.cards.id, req.params.cardId)).returning();
  res.json({ success: true, data: updated[0] });
});

router.patch("/cards/:cardId", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const updated = await db.update(schema.cards).set(parsed.data).where(eq(schema.cards.id, req.params.cardId)).returning();
  res.json({ success: true, data: updated[0] });
});

// Comments
router.get("/cards/:cardId/comments", async (req: Request, res: Response) => {
  const comments = await db.select().from(schema.comments).where(eq(schema.comments.cardId, req.params.cardId));
  res.json({ success: true, data: comments });
});

router.post("/cards/:cardId/comments", requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateCommentSchema.safeParse({
    ...req.body,
    cardId: req.params.cardId,
    userId: req.user!.id,
  });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.comments).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

export { router as boardRoutes };
