const app = require("./app");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary");
const connectDatabase = require("./config/database");


//HANDLING UNCAUGHT EXCEPTION
process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to UNCAUGHT EXCEPTION`);
    process.exit(1);
  });
 
//config
dotenv.config({ path: ".env" });

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

// UNHANDLED PROMISE REJECTION
process.on("unhandledRejection", (err) => {
    console.log(`Error:${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise Rejection`);
  
    server.close(() => {
      process.exit(1);
    });
  });
