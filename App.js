const User = require("./models/user");
const isLoggedIn = require("./middlewares/isLoggedIn");
const findUser = require("./middlewares/findUser");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(
  session({
    secret: process.env.SECRETKEYSESSION,
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
  const { username, password, passcode, city } = req.body;
  // console.log(name, password, city, passcode);
  if (passcode == process.env.PASSCODE) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, password: hashedPassword, city });
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

// app.get("/account", isLoggedIn, findUser, (req, res) => {
//   //just rendering the missed fileds. nned to fix that. get user details, find the missing fileds, pass that to ejs and ejs renders form based on missing inputs
//   console.log(req.userData);
//   const userData = req.userData;
//   res.render("account", { userData });
// });

// app.post("/account", async (req, res) => {
//   const { adress, city, contact, religion } = req.body;
//   await User.findByIdAndUpdate(req.session.userId, {
//     adress,
//     city,
//     contact,
//     religion,
//   });
//   return res.send("updated your profile");
// });

app.get(["/account", "/account/info"], isLoggedIn, findUser, (req, res) => {
  const accountInfo = req.userData;
  res.render("account/accountInfo", { accountInfo });
});

// app.get("/yourAccount/info", isLoggedIn, findUser, (req, res) => {
//   const accountInfo = req.userData;
//   console.log(accountInfo);
//   res.render("userAccount/accountInfo", { accountInfo });
// });
app.get("/account/peopleInterested", isLoggedIn, findUser, (req, res) => {
  const accountInfo = req.userData;
  console.log(accountInfo);
  res.render("account/peopleInterested", { accountInfo });
});

app.get("/profiles", async (req, res) => {
  //we will get only name, gender, city and _id say. modify this and get only specific informations.
  const profiles = await User.find({});
  console.log(profiles);
  return res.render("profiles", { profiles });
});
app.get("/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const foundProfile = await User.findById(id);
    console.log(foundProfile);
    if (!foundProfile) {
      return res.status(404).send("Profile not found");
    }
    res.render("profile", { profile: foundProfile });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.post("/interested/:id", isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const beingLikedUser = await User.findById(id);
  console.log(beingLikedUser);
  const likeUserId = req.session.userId;
  if (
    !beingLikedUser.peopleInterested.some(
      (id) => id.toString() === likeUserId.toString()
    )
  ) {
    console.log("this is running code");
    console.log(beingLikedUser);
    console.log(likeUserId);
    beingLikedUser.peopleInterested.push(likeUserId);
    await beingLikedUser.save();
  }
  return res.json({ message: "User has been added to peopleInterested" });
});
// app.get("/everyprof", async (req, res) => {
//   const allprofs = await User.find({}).populate("peopleInterested");
//   console.log(allprofs);
// });
app.get("/kamran", async (req, res) => {
  const ahmad = await User.find({ username: "kamran" }).populate(
    "peopleInterested"
  );
  console.log(JSON.stringify(ahmad, null, 2));
});

app.listen(3000, (req, res) => {
  console.log("on port 3000!");
});
