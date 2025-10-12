const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middleware/error");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cors = require('cors')
const path = require("path");

app.use(cors());
app.use(express.json());
app.use(cookieParser()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

//Route Imports 
const project = require("./routes/projectRoute");
const user = require("./routes/userRoute");
const bid = require("./routes/bidRoute");
const earning = require("./routes/earningRoute");

app.use("/api/v1", project);
app.use("/api/v1", user);
app.use("/api/v1", bid);
app.use("/api/v1", earning);

app.use(express.static(path.join(__dirname, "../frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../frontend/build/index.html"));
});

// MIDDLEWARE FOR ERROR
app.use(errorMiddleware);

module.exports = app;
