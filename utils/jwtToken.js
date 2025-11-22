// utils/jwtToken.js
const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  // HARD-CODED FOR PRODUCTION — NO CONDITIONALS!
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: true,        // MUST be true on HTTPS
    sameSite: "none",    // MUST be "none" for cross-site
    path: "/",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user,
      // token, // optional: only if you want Bearer fallback
    });
};

module.exports = sendToken;