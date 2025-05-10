const User = require("./models/user");
const Request = require("./models/Request");
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
    req.session.user = newUser;
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
    req.session.user = foundUser;
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

app.get("/account/edit", isLoggedIn, findUser, (req, res) => {
  const userData = req.userData;
  res.render("account/edit", { userData });
});
app.post("/account/edit", isLoggedIn, findUser, async (req, res) => {
  const { name, adress, city, contact, gender } = req.body;
  const user = req.userData;

  // Update fields if they exist
  user.name = name || user.name;
  user.adress = adress || user.adress;
  user.city = city || user.city;
  user.contact = contact || user.contact;
  user.gender = gender || user.gender;

  await user.save();
  res.redirect("/account"); // or wherever you want to redirect
});

app.get(["/account", "/account/info"], isLoggedIn, findUser, (req, res) => {
  const accountInfo = req.userData;
  res.render("account/accountInfo", { accountInfo });
});

app.get("/account/pendingRequests", isLoggedIn, async (req, res) => {
  const beinglikeduser = await User.findById(req.session.userId).populate({
    path: "likeRequests",
    match: { status: "pending" },
    populate: [
      { path: "from", model: "User" },
      // { path: "to", model: "User" },
    ],
  });
  const pendinglikeRequests = beinglikeduser.likeRequests;
  res.render("account/pendingLikeRequests", { pendinglikeRequests });
});
app.get("/account/acceptedRequests", isLoggedIn, async (req, res) => {
  const beinglikeduser = await User.findById(req.session.userId).populate({
    path: "likeRequests",
    match: { status: "accepted" },
    populate: [
      { path: "from", model: "User" },
      // { path: "to", model: "User" },
    ],
  });
  const acceptedlikeRequests = beinglikeduser.likeRequests;
  res.render("account/acceptedLikeRequests", { acceptedlikeRequests });
});
app.get("/account/yourRequests", isLoggedIn, async (req, res) => {
  const requestsSentByYou = await Request.find({
    from: req.session.userId,
  }).populate("to");
  res.render("account/yourRequests", { requestsSentByYou });
});

app.post("/requests/:id/accept", async (req, res) => {
  const requestId = req.params.id;
  const request = await Request.findById(requestId);
  request.status = "accepted";
  await request.save();
  res.json({ message: "request accepted" });
});
app.post("/requests/:id/reject", async (req, res) => {
  const requestId = req.params.id;
  const request = await Request.findById(requestId);
  request.status = "rejected";
  await request.save();
  res.json({ message: "request rejected" });
});

// app.get("/account/peopleInterested", isLoggedIn, findUser, (req, res) => {
//   //will be used as a notification system only.
//   const accountInfo = req.userData;
//   console.log(accountInfo);
//   res.render("account/peopleInterested", { accountInfo });
// });

// app.get("/account/youAreSharingWith", (req, res) => {});
// app.get("/account/sharingWithYou", (req, res) => {});
// app.get("/account/mutualSharing", (req, res) => {});

// app.get("/account/shared", isLoggedIn, findUser, async (req, res) => {
//   const allAccounts = await User.find().populate("peopleInterested");
//   const yourInfoSharedWithAccounts = allAccounts.filter((account) =>
//     account.peopleInterested.some(
//       (person) => person._id.toString() === req.userData._id.toString()
//     )
//   );
//   res.render("account/shared", { yourInfoSharedWithAccounts });
// });

app.get("/profiles", async (req, res) => {
  //we will get only name, gender, city and _id say. modify this and get only specific informations.
  const profiles = await User.find({});
  // console.log(profiles);
  return res.render("profiles", { profiles });
});
app.get("/profiles/:id", async (req, res) => {
  try {
    console.log("user visited");
    const { id } = req.params;
    const foundProfile = await User.findById(id);
    // console.log("profile found", foundProfile);
    if (!foundProfile) {
      return res.status(404).send("Profile not found");
    }
    res.render("profile", { profile: foundProfile });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.post("/interested/:id", isLoggedIn, async (req, res) => {
  const beinglikeduserId = req.params.id; //beingliked
  const beingLikedUser = await User.findById(beinglikeduserId);
  // console.log(beingLikedUser);
  const likeUserId = req.session.userId; //whoisliking
  const newRequest = new Request({
    from: likeUserId,
    to: beinglikeduserId,
  });
  await newRequest.save();
  // const beinglikeduser = req.session.user;
  // const beinglikedUser = await User.findById(req.session.userId);
  beingLikedUser.likeRequests.push(newRequest);
  await beingLikedUser.save();
  return res.json({
    message: `successully sent your like request along with your data to ${beingLikedUser.username}`,
  });
  //need to handle duplicate requests.

  //   if (
  //     !beingLikedUser.peopleInterested.some(
  //       (id) => id.toString() === likeUserId.toString()
  //     )
  //   ) {
  //     console.log("this is running code");
  //     console.log(beingLikedUser);
  //     console.log(likeUserId);
  //     beingLikedUser.peopleInterested.push(likeUserId);
  //     await beingLikedUser.save();
  //   }
  //   return res.json({ message: "User has been added to peopleInterested" });
});
// app.post(
//   "/account/stop-sharing/:id",
//   isLoggedIn,
//   findUser,
//   async (req, res) => {
//     const userIdToRemove = req.params.id;
//     const currentUserId = req.userData._id;

//     const user = await User.findById(userIdToRemove);
//     if (!user) return res.json({ success: false, message: "User not found" });

//     user.peopleInterested = user.peopleInterested.filter(
//       (id) => id.toString() !== currentUserId.toString()
//     );

//     await user.save();
//     res.json({ success: true });
//   }
// );
app.listen(3000, (req, res) => {
  console.log("on port 3000!");
});
