const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middleware/error");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cors = require("cors");

// ✅ Proper CORS setup
const allowedOrigins = [
  "https://frontend-fw.onrender.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.options("*", cors());

// ✅ Standard middlewares
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

// ✅ Routes
const project = require("./routes/projectRoute");
const user = require("./routes/userRoute");
const bid = require("./routes/bidRoute");
const earning = require("./routes/earningRoute");

app.use("/api/v1", project);
app.use("/api/v1", user);
app.use("/api/v1", bid);
app.use("/api/v1", earning);

// ❌ Remove this in backend-only deploys on Render
// app.use(express.static(path.join(__dirname, "../frontend/dist")));
// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
// });

// ✅ Error handler
app.use(errorMiddleware);

module.exports = app;
