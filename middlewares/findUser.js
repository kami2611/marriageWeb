const User = require("../models/user");
module.exports = async function findUser(req, res, next) {
  try {
    const user = await User.findById(req.session.userId);
    req.userData = user;
    return next();
  } catch (error) {
    console.log(error);
  }
};
