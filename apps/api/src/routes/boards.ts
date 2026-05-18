import { Router, Request, Response } from "express";
import { CreateBoardSchema, UpdateBoardSchema, CreateColumnSchema, CreateCardSchema, UpdateCardSchema, CreateCommentSchema } from "@group/shared";
import { db, schema } from "@group/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

async function getOwnedBoard(boardId: string, userId: string) {
  const board = await db
    .select()
    .from(schema.boards)
    .where(and(eq(schema.boards.id, boardId), eq(schema.boards.createdBy, userId)))
    .limit(1);

  return board[0] ?? null;
}

async function getOwnedColumn(columnId: string, userId: string) {
  const column = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.id, columnId))
    .limit(1);

  if (!column.length) return null;
  const board = await getOwnedBoard(column[0].boardId, userId);
  return board ? column[0] : null;
}

async function getOwnedCard(cardId: string, userId: string) {
  const card = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.id, cardId))
    .limit(1);

  if (!card.length) return null;
  const column = await getOwnedColumn(card[0].columnId, userId);
  return column ? card[0] : null;
}

// Boards
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const boards = await db.select().from(schema.boards).where(eq(schema.boards.createdBy, req.user!.id));
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

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const board = await getOwnedBoard(req.params.id, req.user!.id);
  if (!board) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true, data: board });
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateBoardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const updated = await db
    .update(schema.boards)
    .set(parsed.data)
    .where(and(eq(schema.boards.id, req.params.id), eq(schema.boards.createdBy, req.user!.id)))
    .returning();
  if (!updated.length) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true, data: updated[0] });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const deleted = await db
    .delete(schema.boards)
    .where(and(eq(schema.boards.id, req.params.id), eq(schema.boards.createdBy, req.user!.id)))
    .returning();
  if (!deleted.length) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true });
});

// Columns
router.get("/:id/columns", requireAuth, async (req: Request, res: Response) => {
  const board = await getOwnedBoard(req.params.id, req.user!.id);
  if (!board) return res.status(404).json({ success: false, message: "Board not found" });

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
  const board = await getOwnedBoard(req.params.id, req.user!.id);
  if (!board) return res.status(404).json({ success: false, message: "Board not found" });

  const parsed = CreateColumnSchema.safeParse({ ...req.body, boardId: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.columns).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

// Card routes via column
router.post("/columns/:columnId/cards", requireAuth, async (req: Request, res: Response) => {
  const column = await getOwnedColumn(req.params.columnId, req.user!.id);
  if (!column) return res.status(404).json({ success: false, message: "Column not found" });

  const parsed = CreateCardSchema.safeParse({ ...req.body, columnId: req.params.columnId });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.cards).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

router.patch("/cards/:cardId/move", requireAuth, async (req: Request, res: Response) => {
  const { columnId, order, updates } = req.body;
  if (!columnId) return res.status(400).json({ success: false, message: "columnId required" });
  if (!Number.isInteger(order) || order < 0) return res.status(400).json({ success: false, message: "order must be a non-negative integer" });

  const card = await getOwnedCard(req.params.cardId, req.user!.id);
  const targetColumn = await getOwnedColumn(columnId, req.user!.id);
  if (!card || !targetColumn) return res.status(404).json({ success: false, message: "Card or column not found" });

  if (updates !== undefined) {
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "updates must be an array" });
    }

    for (const update of updates) {
      if (!update?.id || !update?.columnId || !Number.isInteger(update.order) || update.order < 0) {
        return res.status(400).json({ success: false, message: "updates must include id, columnId, and non-negative order" });
      }

      const updateCard = await getOwnedCard(update.id, req.user!.id);
      const updateColumn = await getOwnedColumn(update.columnId, req.user!.id);
      if (!updateCard || !updateColumn) {
        return res.status(404).json({ success: false, message: "Card or column not found" });
      }
    }
  }

  const updated = await db.update(schema.cards).set({ columnId, order }).where(eq(schema.cards.id, req.params.cardId)).returning();
  if (Array.isArray(updates)) {
    for (const update of updates) {
      if (update.id === req.params.cardId) continue;
      await db
        .update(schema.cards)
        .set({ columnId: update.columnId, order: update.order })
        .where(eq(schema.cards.id, update.id));
    }
  }

  res.json({ success: true, data: updated[0] });
});

router.patch("/cards/:cardId", requireAuth, async (req: Request, res: Response) => {
  const card = await getOwnedCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

  const parsed = UpdateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const updated = await db.update(schema.cards).set(parsed.data).where(eq(schema.cards.id, req.params.cardId)).returning();
  res.json({ success: true, data: updated[0] });
});

// Comments
router.get("/cards/:cardId/comments", requireAuth, async (req: Request, res: Response) => {
  const card = await getOwnedCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

  const comments = await db.select().from(schema.comments).where(eq(schema.comments.cardId, req.params.cardId));
  res.json({ success: true, data: comments });
});

router.post("/cards/:cardId/comments", requireAuth, async (req: Request, res: Response) => {
  const card = await getOwnedCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

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
