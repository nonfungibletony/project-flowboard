import { z } from "zod";

// User
export const UserSchema = z.object({
  id: z.string().uuid(),
  clerkUserId: z.string().min(1).max(255),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
});

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
export const UpdateUserSchema = CreateUserSchema.partial();

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// Board
export const BoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateBoardSchema = BoardSchema.omit({ id: true, createdBy: true, createdAt: true, updatedAt: true });
export const UpdateBoardSchema = CreateBoardSchema.partial();

export type Board = z.infer<typeof BoardSchema>;
export type CreateBoard = z.infer<typeof CreateBoardSchema>;
export type UpdateBoard = z.infer<typeof UpdateBoardSchema>;

// Column
export const ColumnSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string().min(1).max(200),
  order: z.number().int().min(0),
  createdAt: z.string().datetime(),
  cards: z.array(z.any()).optional(),
});

export const CreateColumnSchema = ColumnSchema.omit({ id: true, createdAt: true, cards: true });
export const UpdateColumnSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
});

export type Column = z.infer<typeof ColumnSchema>;
export type CreateColumn = z.infer<typeof CreateColumnSchema>;
export type UpdateColumn = z.infer<typeof UpdateColumnSchema>;

// Card
export const CardSchema = z.object({
  id: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  order: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  comments: z.array(z.any()).optional(),
});

export const CreateCardSchema = CardSchema.omit({ id: true, order: true, createdAt: true, updatedAt: true, comments: true });
export const UpdateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  columnId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
});

export type Card = z.infer<typeof CardSchema>;
export type CreateCard = z.infer<typeof CreateCardSchema>;
export type UpdateCard = z.infer<typeof UpdateCardSchema>;

// Comment
export const CommentSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  createdAt: z.string().datetime(),
});

export const CreateCommentSchema = CommentSchema.omit({ id: true, createdAt: true });

export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;

// API Response helper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });

export const HealthCheckSchema = z.object({
  status: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
