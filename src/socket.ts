// socket.module.ts

import * as http from "http";
import { Server, Socket } from "socket.io";
import { createMedicalBot } from "./agents/medicalbot.agent";

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket: Socket) => {
    console.log("New connection:", socket.id);

    let bot: ReturnType<typeof createMedicalBot> | null = null;

    socket.on("init", (extractedData) => {
      bot = createMedicalBot(extractedData);
      socket.emit("ready", "Bot ready hai!");
    });

    socket.on("message", async (message: string) => {
      if (!bot) {
        socket.emit("message", "Pehle document upload karo.");
        return;
      }

      try {
        const reply = await bot.sendMessage(message);
        socket.emit("message", reply);
      } catch (error) {
        console.error("Chat error:", error);
        socket.emit(
          "message",
          error instanceof Error
            ? `Chat failed: ${error.message}`
            : "Chat failed. Please try again.",
        );
      }
    });

    socket.on("disconnect", () => {
      bot = null;
    });
  });
}
