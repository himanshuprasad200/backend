// utils/jwtToken.js
const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };

  // SEND TOKEN IN BODY TOO — THIS IS CRITICAL
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user,
    token, // ← THIS LINE FIXES EVERYTHING
  });
};

module.exports = sendToken;