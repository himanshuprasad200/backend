// utils/jwtToken.js

const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  // Cookie options – CRITICAL FOR PRODUCTION
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" for cross-site
    path: "/",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user,
      // token, // optional: don't send token in body if using httpOnly
    });
};

module.exports = sendToken;