import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HealthCheckSchema } from "@group/shared";
import { boardRoutes } from "./routes/boards.js";
import { userRoutes } from "./routes/users.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { workspaceMemberRoutes } from "./routes/workspace-members.js";
import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/health", (_req: Request, res: Response) => {
  const check = HealthCheckSchema.parse({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, data: check });
});

app.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

app.use("/users", userRoutes);
app.use("/boards", boardRoutes);
app.use("/workspaces", workspaceRoutes);
app.use("/workspaces/:id/members", workspaceMemberRoutes);

// Global error handler — prevents empty responses and hangs from unhandled async errors
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("Unhandled error:", err);
  const message = err?.message || "Internal server error";
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({ success: false, message });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
