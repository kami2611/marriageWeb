const User = require("./models/user");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(
  session({
    secret: process.env.SECRETKEYSESSION, // can use env variable for this
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }, // secure: true only if using HTTPS
  })
);
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
mongoose
  .connect("mongodb://127.0.0.1:27017/marriageajs")
  .then(() => {
    console.log("Mongoose Server Started!");
  })
  .catch((err) => {
    console.log("Err mongoose!");
  });
app.get("/", (req, res) => {
  res.render("home");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", async (req, res) => {
  const { username, password, passcode } = req.body;
  // console.log(name, password, city, passcode);
  if (passcode == process.env.PASSCODE) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    req.session.userId = newUser._id;
    return res.send("successfully registered");
  } else {
    return res.send("invalid passcode , try again");
  }
});
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username: username });
  if (!foundUser) {
    return res.send("User not found");
  }
  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (isMatch) {
    req.session.userId = foundUser._id; // create session
    return res.send("Login successful");
  } else {
    return res.send("Incorrect password");
  }
});
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("error logging out");
    }
    res.clearCookie("connect.sid");
    res.send("Logged out successfully");
  });
});

app.listen(3000, (req, res) => {
  console.log("on port 3000!");
});
