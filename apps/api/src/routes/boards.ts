import { Router, Request, Response, NextFunction } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { CreateBoardSchema, UpdateBoardSchema, CreateColumnSchema, CreateCardSchema, UpdateCardSchema, CreateCommentSchema, CreateLabelSchema, InviteBoardMemberSchema } from "@group/shared";
import { db, schema } from "@group/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
// MVP storage: local disk. The DB stores metadata and a served file URL.
const ATTACHMENT_DIR = path.resolve(process.cwd(), "uploads", "attachments");

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fs.mkdir(ATTACHMENT_DIR, { recursive: true });
        cb(null, ATTACHMENT_DIR);
      } catch (err) {
        cb(err as Error, ATTACHMENT_DIR);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
});

function uploadAttachment(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "Files must be 10 MB or smaller" });
    }
    return res.status(400).json({ success: false, message: "Unable to upload file" });
  });
}

type BoardRole = "owner" | "editor" | "viewer";

async function getBoardRole(boardId: string, userId: string): Promise<BoardRole | null> {
  const board = await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId))
    .limit(1);

  if (!board.length) return null;
  if (board[0].createdBy === userId) return "owner";

  const member = await db
    .select()
    .from(schema.boardMembers)
    .where(and(eq(schema.boardMembers.boardId, boardId), eq(schema.boardMembers.userId, userId)))
    .limit(1);

  return (member[0]?.role as BoardRole | undefined) ?? null;
}

async function getReadableBoard(boardId: string, userId: string) {
  const role = await getBoardRole(boardId, userId);
  if (!role) return null;

  const board = await db.select().from(schema.boards).where(eq(schema.boards.id, boardId)).limit(1);
  return board[0] ? { board: board[0], role } : null;
}

async function getWritableBoard(boardId: string, userId: string) {
  const access = await getReadableBoard(boardId, userId);
  if (!access || access.role === "viewer") return null;
  return access;
}

async function getOwnerBoard(boardId: string, userId: string) {
  const access = await getReadableBoard(boardId, userId);
  if (!access || access.role !== "owner") return null;
  return access;
}

async function getReadableColumn(columnId: string, userId: string) {
  const column = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.id, columnId))
    .limit(1);

  if (!column.length) return null;
  const access = await getReadableBoard(column[0].boardId, userId);
  return access ? column[0] : null;
}

async function getWritableColumn(columnId: string, userId: string) {
  const column = await db
    .select()
    .from(schema.columns)
    .where(eq(schema.columns.id, columnId))
    .limit(1);

  if (!column.length) return null;
  const access = await getWritableBoard(column[0].boardId, userId);
  return access ? column[0] : null;
}

async function getReadableCard(cardId: string, userId: string) {
  const card = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.id, cardId))
    .limit(1);

  if (!card.length) return null;
  const column = await getReadableColumn(card[0].columnId, userId);
  return column ? card[0] : null;
}

async function getWritableCard(cardId: string, userId: string) {
  const card = await db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.id, cardId))
    .limit(1);

  if (!card.length) return null;
  const column = await getWritableColumn(card[0].columnId, userId);
  return column ? card[0] : null;
}

async function getWritableCardBoard(cardId: string, userId: string) {
  const card = await getWritableCard(cardId, userId);
  if (!card) return null;

  const column = await getWritableColumn(card.columnId, userId);
  if (!column) return null;

  return { card, boardId: column.boardId };
}

async function getWritableAttachment(attachmentId: string, userId: string) {
  const attachment = await db
    .select()
    .from(schema.attachments)
    .where(eq(schema.attachments.id, attachmentId))
    .limit(1);

  if (!attachment.length) return null;
  const card = await getWritableCard(attachment[0].cardId, userId);
  return card ? attachment[0] : null;
}

async function getLabelsByCardIds(cardIds: string[]) {
  const labelsByCard = new Map<string, Array<typeof schema.labels.$inferSelect>>();
  if (!cardIds.length) return labelsByCard;

  const rows = await db
    .select({
      cardId: schema.cardLabels.cardId,
      label: schema.labels,
    })
    .from(schema.cardLabels)
    .innerJoin(schema.labels, eq(schema.cardLabels.labelId, schema.labels.id))
    .where(inArray(schema.cardLabels.cardId, cardIds));

  for (const row of rows) {
    labelsByCard.set(row.cardId, [...(labelsByCard.get(row.cardId) || []), row.label]);
  }

  return labelsByCard;
}

// Boards
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const ownedBoards = await db.select().from(schema.boards).where(eq(schema.boards.createdBy, req.user!.id));
  const memberBoards = await db
    .select({ board: schema.boards })
    .from(schema.boardMembers)
    .innerJoin(schema.boards, eq(schema.boardMembers.boardId, schema.boards.id))
    .where(eq(schema.boardMembers.userId, req.user!.id));

  const byId = new Map(ownedBoards.map((board) => [board.id, board]));
  for (const row of memberBoards) {
    byId.set(row.board.id, row.board);
  }

  const boards = [...byId.values()].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  res.json({ success: true, data: boards });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateBoardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const { templateId, ...boardData } = parsed.data;
  const template = templateId
    ? await db.select().from(schema.boardTemplates).where(eq(schema.boardTemplates.id, templateId)).limit(1)
    : [];

  if (templateId && !template.length) {
    return res.status(400).json({ success: false, message: "Template not found" });
  }

  const inserted = await db.insert(schema.boards).values({
    ...boardData,
    createdBy: req.user!.id,
  }).returning();

  await db.insert(schema.boardMembers).values({
    boardId: inserted[0].id,
    userId: req.user!.id,
    role: "owner",
  });

  if (template[0]) {
    const templateColumns = Array.isArray(template[0].columns) ? template[0].columns : [];
    const columnValues = templateColumns
      .filter((column): column is { name: string } => typeof column?.name === "string" && column.name.trim().length > 0)
      .map((column, index) => ({
        boardId: inserted[0].id,
        name: column.name.trim().slice(0, 200),
        order: index,
      }));

    if (columnValues.length) {
      await db.insert(schema.columns).values(columnValues);
    }
  }

  res.status(201).json({ success: true, data: inserted[0] });
});

router.get("/templates", requireAuth, async (_req: Request, res: Response) => {
  const templates = await db.select().from(schema.boardTemplates);
  res.json({ success: true, data: templates });
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const access = await getReadableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true, data: { ...access.board, role: access.role } });
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const access = await getWritableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const parsed = UpdateBoardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const updated = await db
    .update(schema.boards)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schema.boards.id, req.params.id))
    .returning();
  if (!updated.length) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true, data: updated[0] });
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const access = await getOwnerBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const deleted = await db
    .delete(schema.boards)
    .where(eq(schema.boards.id, req.params.id))
    .returning();
  if (!deleted.length) return res.status(404).json({ success: false, message: "Board not found" });
  res.json({ success: true });
});

// Members
router.get("/:id/members", requireAuth, async (req: Request, res: Response) => {
  const access = await getReadableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const owner = await db
    .select({
      boardId: schema.boards.id,
      userId: schema.users.id,
      role: schema.boardMembers.role,
      email: schema.users.email,
      name: schema.users.name,
      createdAt: schema.users.createdAt,
    })
    .from(schema.boards)
    .innerJoin(schema.users, eq(schema.boards.createdBy, schema.users.id))
    .leftJoin(schema.boardMembers, and(eq(schema.boardMembers.boardId, schema.boards.id), eq(schema.boardMembers.userId, schema.users.id)))
    .where(eq(schema.boards.id, req.params.id))
    .limit(1);

  const members = await db
    .select({
      boardId: schema.boardMembers.boardId,
      userId: schema.users.id,
      role: schema.boardMembers.role,
      email: schema.users.email,
      name: schema.users.name,
      createdAt: schema.boardMembers.createdAt,
    })
    .from(schema.boardMembers)
    .innerJoin(schema.users, eq(schema.boardMembers.userId, schema.users.id))
    .where(eq(schema.boardMembers.boardId, req.params.id));

  const byUserId = new Map(members.map((member) => [member.userId, member]));
  if (owner[0]) {
    byUserId.set(owner[0].userId, { ...owner[0], role: "owner" });
  }

  res.json({ success: true, data: [...byUserId.values()] });
});

router.post("/:id/members", requireAuth, async (req: Request, res: Response) => {
  const access = await getOwnerBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const parsed = InviteBoardMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }

  const user = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email)).limit(1);
  if (!user.length) return res.status(404).json({ success: false, message: "User not found" });
  if (user[0].id === access.board.createdBy) {
    return res.status(400).json({ success: false, message: "Board owner is already a member" });
  }

  const existing = await db
    .select()
    .from(schema.boardMembers)
    .where(and(eq(schema.boardMembers.boardId, req.params.id), eq(schema.boardMembers.userId, user[0].id)))
    .limit(1);

  const member = existing.length
    ? await db
        .update(schema.boardMembers)
        .set({ role: parsed.data.role })
        .where(and(eq(schema.boardMembers.boardId, req.params.id), eq(schema.boardMembers.userId, user[0].id)))
        .returning()
    : await db
        .insert(schema.boardMembers)
        .values({ boardId: req.params.id, userId: user[0].id, role: parsed.data.role })
        .returning();

  res.status(existing.length ? 200 : 201).json({
    success: true,
    data: { ...member[0], email: user[0].email, name: user[0].name },
  });
});

router.delete("/:id/members/:userId", requireAuth, async (req: Request, res: Response) => {
  const access = await getOwnerBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });
  if (req.params.userId === access.board.createdBy) {
    return res.status(400).json({ success: false, message: "Cannot remove the board owner" });
  }

  await db
    .delete(schema.boardMembers)
    .where(and(eq(schema.boardMembers.boardId, req.params.id), eq(schema.boardMembers.userId, req.params.userId)));
  res.json({ success: true });
});

// Labels
router.get("/:id/labels", requireAuth, async (req: Request, res: Response) => {
  const access = await getReadableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const labels = await db.select().from(schema.labels).where(eq(schema.labels.boardId, req.params.id));
  res.json({ success: true, data: labels });
});

router.post("/:id/labels", requireAuth, async (req: Request, res: Response) => {
  const access = await getWritableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const parsed = CreateLabelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }

  const inserted = await db
    .insert(schema.labels)
    .values({ ...parsed.data, boardId: req.params.id })
    .returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

// Columns
router.get("/:id/columns", requireAuth, async (req: Request, res: Response) => {
  const access = await getReadableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const cols = await db.select().from(schema.columns).where(eq(schema.columns.boardId, req.params.id));
  const colsWithCards = await Promise.all(
    cols.map(async (col) => {
      const cards = await db.select().from(schema.cards).where(eq(schema.cards.columnId, col.id));
      const labelsByCard = await getLabelsByCardIds(cards.map((card) => card.id));
      return {
        ...col,
        cards: cards.map((card) => ({ ...card, labels: labelsByCard.get(card.id) || [] })),
      };
    })
  );
  res.json({ success: true, data: colsWithCards });
});

router.post("/:id/columns", requireAuth, async (req: Request, res: Response) => {
  const access = await getWritableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const parsed = CreateColumnSchema.safeParse({ ...req.body, boardId: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const inserted = await db.insert(schema.columns).values(parsed.data).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

router.patch("/:id/columns/reorder", requireAuth, async (req: Request, res: Response) => {
  const access = await getWritableBoard(req.params.id, req.user!.id);
  if (!access) return res.status(404).json({ success: false, message: "Board not found" });

  const updates = req.body.updates;
  if (!Array.isArray(updates) || !updates.length) {
    return res.status(400).json({ success: false, message: "updates must be a non-empty array" });
  }

  for (const update of updates) {
    if (!update?.id || !Number.isInteger(update.order) || update.order < 0) {
      return res.status(400).json({ success: false, message: "updates must include id and non-negative order" });
    }
  }

  const columnIds = updates.map((update) => update.id);
  const columns = await db
    .select()
    .from(schema.columns)
    .where(and(inArray(schema.columns.id, columnIds), eq(schema.columns.boardId, req.params.id)));

  if (columns.length !== columnIds.length) {
    return res.status(400).json({ success: false, message: "All columns must belong to this board" });
  }

  for (const update of updates) {
    await db
      .update(schema.columns)
      .set({ order: update.order })
      .where(eq(schema.columns.id, update.id));
  }

  const reordered = await db.select().from(schema.columns).where(eq(schema.columns.boardId, req.params.id));
  res.json({ success: true, data: reordered });
});

// Card routes via column
router.post("/columns/:columnId/cards", requireAuth, async (req: Request, res: Response) => {
  const column = await getWritableColumn(req.params.columnId, req.user!.id);
  if (!column) return res.status(404).json({ success: false, message: "Column not found" });

  const parsed = CreateCardSchema.safeParse({ ...req.body, columnId: req.params.columnId });
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }
  const values = {
    ...parsed.data,
    dueDate: parsed.data.dueDate === undefined
      ? undefined
      : parsed.data.dueDate === null
        ? null
        : new Date(parsed.data.dueDate),
  };
  const inserted = await db.insert(schema.cards).values(values).returning();
  res.status(201).json({ success: true, data: inserted[0] });
});

router.patch("/cards/:cardId/move", requireAuth, async (req: Request, res: Response) => {
  const { columnId, order, updates } = req.body;
  if (!columnId) return res.status(400).json({ success: false, message: "columnId required" });
  if (!Number.isInteger(order) || order < 0) return res.status(400).json({ success: false, message: "order must be a non-negative integer" });

  const card = await getWritableCard(req.params.cardId, req.user!.id);
  const targetColumn = await getWritableColumn(columnId, req.user!.id);
  if (!card || !targetColumn) return res.status(404).json({ success: false, message: "Card or column not found" });

  if (updates !== undefined) {
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "updates must be an array" });
    }

    for (const update of updates) {
      if (!update?.id || !update?.columnId || !Number.isInteger(update.order) || update.order < 0) {
        return res.status(400).json({ success: false, message: "updates must include id, columnId, and non-negative order" });
      }

      const updateCard = await getWritableCard(update.id, req.user!.id);
      const updateColumn = await getWritableColumn(update.columnId, req.user!.id);
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
  const card = await getWritableCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

  const parsed = UpdateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.message });
  }

  const values = {
    ...parsed.data,
    dueDate: parsed.data.dueDate === undefined
      ? undefined
      : parsed.data.dueDate === null
        ? null
        : new Date(parsed.data.dueDate),
  };

  const updated = await db.update(schema.cards).set(values).where(eq(schema.cards.id, req.params.cardId)).returning();
  res.json({ success: true, data: updated[0] });
});

router.patch("/cards/:cardId/labels", requireAuth, async (req: Request, res: Response) => {
  const cardBoard = await getWritableCardBoard(req.params.cardId, req.user!.id);
  if (!cardBoard) return res.status(404).json({ success: false, message: "Card not found" });

  const labelIds = req.body.labelIds;
  if (!Array.isArray(labelIds) || labelIds.some((id) => typeof id !== "string")) {
    return res.status(400).json({ success: false, message: "labelIds must be an array of label IDs" });
  }

  const uniqueLabelIds = [...new Set(labelIds)];
  const labels = uniqueLabelIds.length
    ? await db
        .select()
        .from(schema.labels)
        .where(and(inArray(schema.labels.id, uniqueLabelIds), eq(schema.labels.boardId, cardBoard.boardId)))
    : [];

  if (labels.length !== uniqueLabelIds.length) {
    return res.status(400).json({ success: false, message: "All labels must belong to this board" });
  }

  await db.delete(schema.cardLabels).where(eq(schema.cardLabels.cardId, req.params.cardId));
  if (uniqueLabelIds.length) {
    await db.insert(schema.cardLabels).values(
      uniqueLabelIds.map((labelId) => ({
        cardId: req.params.cardId,
        labelId,
      }))
    );
  }

  res.json({ success: true, data: labels });
});

// Attachments
router.get("/cards/:cardId/attachments", requireAuth, async (req: Request, res: Response) => {
  const card = await getReadableCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

  const attachments = await db
    .select()
    .from(schema.attachments)
    .where(eq(schema.attachments.cardId, req.params.cardId));
  res.json({ success: true, data: attachments });
});

router.post("/cards/:cardId/attachments", requireAuth, uploadAttachment, async (req: Request, res: Response) => {
  const card = await getWritableCard(req.params.cardId, req.user!.id);
  if (!card) {
    if (req.file) await fs.unlink(req.file.path).catch(() => undefined);
    return res.status(404).json({ success: false, message: "Card not found" });
  }

  if (!req.file) return res.status(400).json({ success: false, message: "File is required" });

  const inserted = await db
    .insert(schema.attachments)
    .values({
      cardId: req.params.cardId,
      fileName: req.file.originalname,
      fileUrl: `/uploads/attachments/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype || "application/octet-stream",
      uploadedBy: req.user!.id,
    })
    .returning();

  res.status(201).json({ success: true, data: inserted[0] });
});

router.delete("/attachments/:id", requireAuth, async (req: Request, res: Response) => {
  const attachment = await getWritableAttachment(req.params.id, req.user!.id);
  if (!attachment) return res.status(404).json({ success: false, message: "Attachment not found" });

  const deleted = await db
    .delete(schema.attachments)
    .where(eq(schema.attachments.id, req.params.id))
    .returning();
  if (!deleted.length) return res.status(404).json({ success: false, message: "Attachment not found" });

  const filePath = path.resolve(process.cwd(), deleted[0].fileUrl.replace(/^\//, ""));
  const relativePath = path.relative(ATTACHMENT_DIR, filePath);
  if (relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    await fs.unlink(filePath).catch(() => undefined);
  }

  res.json({ success: true });
});

router.delete("/cards/:cardId", requireAuth, async (req: Request, res: Response) => {
  const card = await getWritableCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

  const deleted = await db.delete(schema.cards).where(eq(schema.cards.id, req.params.cardId)).returning();
  if (!deleted.length) return res.status(404).json({ success: false, message: "Card not found" });

  res.json({ success: true });
});

// Comments
router.get("/cards/:cardId/comments", requireAuth, async (req: Request, res: Response) => {
  const card = await getReadableCard(req.params.cardId, req.user!.id);
  if (!card) return res.status(404).json({ success: false, message: "Card not found" });

  const comments = await db.select().from(schema.comments).where(eq(schema.comments.cardId, req.params.cardId));
  res.json({ success: true, data: comments });
});

router.post("/cards/:cardId/comments", requireAuth, async (req: Request, res: Response) => {
  const card = await getWritableCard(req.params.cardId, req.user!.id);
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
