const mongoose = require("mongoose");

const connectDatabase = () => {
  try {
    mongoose.connect(process.env.DB_URL);
    console.log("Connected to database")
  } catch (error) {
    console.error("database connection error")
    process.exit(0);
  }
};

module.exports = connectDatabase;
