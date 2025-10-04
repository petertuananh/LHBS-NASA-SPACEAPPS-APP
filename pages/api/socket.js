import { Server } from "socket.io";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("🚀 Starting Socket.io server...");

    const io = new Server(res.socket.server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      transports: ["websocket"]
    });

    const onlineUsers = {};

    io.on("connection", (socket) => {
      // 🔥 Lấy tên từ query
      const name = socket.handshake.query.name || `Explorer-${socket.id.slice(0, 5)}`;
      onlineUsers[socket.id] = name;

      console.log(`✅ Connected: ${socket.id} as ${name}`);

      // Gửi event "user:join" cho mọi người khác
      io.emit("user:join", { id: socket.id, name });

      // Khi client ngắt kết nối
      socket.on("disconnect", () => {
        const leftName = onlineUsers[socket.id];
        delete onlineUsers[socket.id];
        io.emit("user:leave", { id: socket.id, name: leftName });
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}
