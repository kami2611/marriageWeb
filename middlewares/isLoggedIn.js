module.exports = function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.send("not logged in");
};
