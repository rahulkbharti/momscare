import "dotenv/config";
import http from "http";
import express from "express";
import { documentRoutes } from "./routes/document.routes";
import { initSocket } from "./socket";

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
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
