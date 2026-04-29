require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const socket = require("./src/socket");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
socket.init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready on ws://localhost:${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});
