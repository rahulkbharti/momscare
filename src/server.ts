import "dotenv/config";
import http from "http";
import express from "express";
import { documentRoutes } from "./routes/document.routes";
import { initSocket } from "./socket";

import { connectDB } from "./db/mongoose";

const app = express();
const server = http.createServer(app);

app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/documents", documentRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initSocket(server);

const port = Number(process.env.PORT) || 8000;

async function startServer() {
  try {
    await connectDB();
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
