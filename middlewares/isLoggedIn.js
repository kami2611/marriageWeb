module.exports = function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect("/login");
  // return res.status(401).json({ message: "You are not logged in" });
};
