// server/app.js  (or server.js)
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const errorMiddleware = require("./middleware/error");

// CRITICAL: Render.com runs behind proxy → MUST trust it!
app.set("trust proxy", 1);

// CORS — Allow your frontend
const allowedOrigins = [
  "https://frontend-fw.onrender.com",  // Your actual frontend
  "http://localhost:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin); // Debug log
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,        // This allows cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

// Body parsers & middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/",
}));

// Import Routes
const project = require("./routes/projectRoute");
const user = require("./routes/userRoute");
const bid = require("./routes/bidRoute");
const earning = require("./routes/earningRoute");

// Mount Routes
app.use("/api/v1", project);
app.use("/api/v1", user);
app.use("/api/v1", bid);
app.use("/api/v1", earning);

// Test route (optional)
app.get("/", (req, res) => {
  res.json({ message: "Backend is running!", time: new Date().toISOString() });
});

// Error Middleware (last)
app.use(errorMiddleware);

module.exports = app;