const User = require("../models/user");

module.exports = async function requireProfileComplete(req, res, next) {
  if (!req.session.userId) return next(); // Not logged in, let other middleware handle

  // Fetch latest user data
  const user = await User.findById(req.session.userId);

  // Adjust required fields as needed
  if (
    !user ||
    !user.name ||
    !user.age ||
    !user.gender ||
    !user.city ||
    !user.caste ||
    !user.religion
  ) {
    // Use query param for message (or use connect-flash if you prefer)
    return res.redirect(
      "/account/edit?msg=You must complete your profile before continuing."
    );
  }
  next();
};
