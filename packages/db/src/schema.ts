import { serial, uuid, varchar, timestamp, pgTable, integer, text, foreignKey, primaryKey, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boards = pgTable("boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: varchar("description", { length: 500 }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  starred: boolean("starred").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const boardTemplates = pgTable("board_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  columns: jsonb("columns").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boardMembers = pgTable("board_members", {
  boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.boardId, table.userId] }),
}));

export const columns = pgTable("columns", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  columnId: uuid("column_id").notNull().references(() => columns.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const labels = pgTable("labels", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  colour: varchar("colour", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardLabels = pgTable("card_labels", {
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  labelId: uuid("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.cardId, table.labelId] }),
}));

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
