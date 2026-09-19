import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./db/client";
import { authRouter } from "./routes/auth";
import { quizRouter } from "./routes/quiz";
import { identityRouter } from "./routes/identity";
import { plansRouter } from "./routes/plans";
import { paymentsRouter } from "./routes/payments";
import { waitlistRouter } from "./routes/waitlist";
import { chatRouter } from "./routes/chat";
import { eventsRouter } from "./routes/events";
import { adminRouter } from "./routes/admin";
import { groupsRouter } from "./routes/groups";
import { safetyRouter } from "./routes/safety";
import { reportsRouter, blocksRouter } from "./routes/reports";
import { circleRouter } from "./routes/circle";
import { notificationsRouter } from "./routes/notifications";
import { hostPortalRouter } from "./routes/hostPortal";
import { uploadsRouter, UPLOAD_DIR } from "./routes/uploads";
import { internalRouter } from "./routes/internal";
import { attachWebSocket } from "./ws";
import { startMatchCron } from "./jobs/matchRunner";
import { startReminderCron } from "./jobs/reminders";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);
const PgSession = connectPgSimple(session);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const sessionMiddleware = session({
  store: new PgSession({ conString: process.env.DATABASE_URL, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET ?? "dev_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
});

app.use(sessionMiddleware);
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/identity", identityRouter);
app.use("/api/plans", plansRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/waitlist", waitlistRouter);
app.use("/api/chat", chatRouter);
app.use("/api/events", eventsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/safety", safetyRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/blocks", blocksRouter);
app.use("/api/circle", circleRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/host", hostPortalRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/internal", internalRouter);

if (isProduction) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads|\/ws).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err?.issues) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input" });
  }
  res.status(500).json({ error: "Something went sideways on our end" });
});

const server = http.createServer(app);
attachWebSocket(server, sessionMiddleware);

const port = Number(process.env.PORT ?? 8787);
server.listen(port, () => {
  console.log(`Delulu API listening on :${port}`);
  startMatchCron();
  startReminderCron();
});

process.on("SIGTERM", () => sql.end());

// Last-resort safety net: log instead of crashing the whole process on an unexpected rejection.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
