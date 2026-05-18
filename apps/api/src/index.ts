import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { HealthCheckSchema } from "@group/shared";
import { boardRoutes } from "./routes/boards.js";
import { userRoutes } from "./routes/users.js";
import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
