module.exports = function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // For GET requests, use originalUrl
  if (req.method === "GET") {
    req.session.returnTo = req.originalUrl;
  }
  // For POST (or others), use returnTo from body if present
  else if (req.body && req.body.returnTo) {
    req.session.returnTo = req.body.returnTo;
  }
  return res.redirect("/login");
};
