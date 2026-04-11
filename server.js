const dotenv = require("dotenv");
dotenv.config({ path: ".env" });
const app = require("./app");
const cloudinary = require("cloudinary");
const connectDatabase = require("./config/database");

//HANDLING UNCAUGHT EXCEPTION
process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to UNCAUGHT EXCEPTION`);
    process.exit(1);
  });


//Connecting Database
connectDatabase(); 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.get('/', (req, res) => {
  res.send('App is running perfectly');
});

const server = app.listen(process.env.PORT, () => {
  console.log(`Server listening on PORT http://localhost:${process.env.PORT}`);
});

// Configure Socket.io
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "https://frontend-fw.onrender.com", 
      "https://frontend-fw-bay.vercel.app",  
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000"
    ],
    credentials: true,
  },
});

const Message = require("./models/messageModel");

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("Connected to socket.io", socket.id);

  // When user joins, add to online users list
  socket.on("add_user", (userId) => {
    // We allow multiple socket connections for the same userId (multiple tabs)
    onlineUsers.push({ userId, socketId: socket.id });
    
    // Broadcast unique online user IDs to others
    const uniqueOnlineUsers = Array.from(new Set(onlineUsers.map(u => u.userId)));
    io.emit("get_users", uniqueOnlineUsers.map(id => ({ userId: id })));
  });

  // Users join a unique room for their chat.
  socket.on("join_chat", (room) => {
    socket.join(room);
  });

  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        sender: String(data.sender),
        receiver: String(data.receiver),
        project: data.project,
        text: data.text,
        media: data.media || null,
      });

      const savedMessage = await newMessage.save();
      
      // Emit to the specific chat room
      io.to(data.room).emit("received_message", savedMessage);

      // Send notifications to ALL active sockets of the receiver
      const receivers = onlineUsers.filter((u) => String(u.userId) === String(data.receiver));
      receivers.forEach(r => {
        io.to(r.socketId).emit("new_notification", {
          sender: String(data.sender),
          senderName: data.senderName,
          text: data.text || (Array.isArray(data.media) ? `Sent ${data.media.length} file(s)` : (data.media ? `Sent a ${data.media.type}` : "sent a file")),
          room: data.room,
        });
      });
    } catch (error) {
      console.log("Socket message error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from socket.io", socket.id);
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    const uniqueOnlineUsers = Array.from(new Set(onlineUsers.map(u => u.userId)));
    io.emit("get_users", uniqueOnlineUsers.map(id => ({ userId: id })));
  });
});

// UNHANDLED PROMISE REJECTION
process.on("unhandledRejection", (err) => {
    console.log(`Error:${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise Rejection`);
  
    server.close(() => {
      process.exit(1);
    });
  });
