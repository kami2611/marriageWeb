const User = require("../models/user");

module.exports = async function requireProfileComplete(req, res, next) {
  if (!req.session.userId) return next(); // Not logged in, let other middleware handle

  // Fetch latest user data
  const user = await User.findById(req.session.userId);

  // Check all required fields for a complete profile
  if (!user || !user.age) {
    // return res.redirect(
    //   "/account/info?msg=You must complete your profile before continuing."
    // );
    return res.status(400).json({
      error: "incomplete_profile",
      message:
        "You must complete your profile before sending requests to others.",
    });
  }
  next();
};
