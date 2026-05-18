CREATE TABLE IF NOT EXISTS "board_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"columns" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
INSERT INTO "board_templates" ("id", "name", "description", "columns") VALUES
	('11111111-1111-4111-8111-111111111111', 'Kanban', 'Backlog, in progress, review, and done.', '[{"name":"Backlog"},{"name":"In progress"},{"name":"Review"},{"name":"Done"}]'::jsonb),
	('22222222-2222-4222-8222-222222222222', 'Simple', 'A lightweight to-do flow.', '[{"name":"To do"},{"name":"Doing"},{"name":"Done"}]'::jsonb),
	('33333333-3333-4333-8333-333333333333', 'Retro', 'Run a team retrospective.', '[{"name":"Went well"},{"name":"Could improve"},{"name":"Action items"}]'::jsonb)
ON CONFLICT ("id") DO NOTHING;
