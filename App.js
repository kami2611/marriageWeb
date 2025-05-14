const User = require("./models/user");
const path = require("path");
const Request = require("./models/Request");
const isLoggedIn = require("./middlewares/isLoggedIn");
const findUser = require("./middlewares/findUser");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SECRETKEYSESSION,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }, // secure: true only if using HTTPS
  })
);
// Add this middleware after your session setup but before your routes
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
mongoose
  .connect("mongodb://127.0.0.1:27017/marriageajs")
  .then(() => {
    console.log("Mongoose Server Started!");
  })
  .catch((err) => {
    console.log("Err mongoose!");
  });
app.use((req, res, next) => {
  // Make user data available to all templates
  res.locals.user = req.session.user || null;
  next();
});
app.get(["/", "/home"], (req, res) => {
  res.render("home", {
    user: req.session.user || null,
  });
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
    return res.json({ error: "username or password is incorrect" });
  }
  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (isMatch) {
    req.session.userId = foundUser._id; // create session
    req.session.user = foundUser;
    return res.json("Login successful");
  } else {
    return res.json({ error: "username or password is incorrect" });
  }
});
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("error logging out");
    }
    res.clearCookie("connect.sid");
    res.redirect("/home");
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

app.post("/requests/:id/accept", isLoggedIn, async (req, res) => {
  const requestId = req.params.id;
  const request = await Request.findById(requestId);
  request.status = "accepted";
  await request.save();
  const requestFromUser = await User.findById(request.from);
  const requestToUser = await User.findById(request.to);
  requestFromUser.canAccessFullProfileOf.push(requestToUser._id);
  requestToUser.canAccessFullProfileOf.push(requestFromUser._id);
  await requestFromUser.save();
  await requestToUser.save();
  res.json({ message: "request accepted" });
});
app.post("/requests/:id/reject", isLoggedIn, async (req, res) => {
  const requestId = req.params.id;
  const request = await Request.findById(requestId);
  request.status = "rejected";
  await request.save();
  const loggedUser = await User.findById(req.session.userId);
  loggedUser.canAccessFullProfileOf.pull(request.from);
  const requestFromUser = await User.findById(request.from);
  try {
    requestFromUser.canAccessFullProfileOf.pull(req.session.userId);
  } catch (error) {
    res.send(
      "maybe the other user doesnt has currently access to your profule",
      error
    );
  }
  await requestFromUser.save();
  await loggedUser.save();
  res.json({ message: "request rejected" });
});

app.post("/requests/:id/cancel", isLoggedIn, async (req, res) => {
  const requestId = req.params.id;
  const requestToCancel = await Request.findById(requestId);
  if (!requestToCancel) {
    return res.status(404).json({ message: "Request not found" });
  }

  const fromUserId = requestToCancel.from.toString();
  const toUserId = requestToCancel.to.toString();

  const fromUser = await User.findById(fromUserId);
  const toUser = await User.findById(toUserId);

  // Remove each other from access lists
  fromUser.canAccessFullProfileOf.pull(toUserId);
  toUser.canAccessFullProfileOf.pull(fromUserId);

  await fromUser.save();
  await toUser.save();
  await Request.findByIdAndDelete(requestId);

  res.json({ message: "Request canceled and access revoked from both sides." });
});

app.get("/profiles", async (req, res) => {
  //we will get only name, gender, city and _id say. modify this and get only specific informations.
  const profiles = await User.find({});
  // console.log(profiles);
  return res.render("profiles", { profiles });
});

app.get("/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const foundProfile = await User.findById(id);
    if (!foundProfile) {
      return res.status(404).send("Profile not found");
    }

    let canAccessFullProfile = false;
    let hasalreadysentrequest = false; // Initialize safely for both logged-in and not

    if (req.session.userId) {
      const loggedUser = await User.findById(req.session.userId);

      if (
        loggedUser.canAccessFullProfileOf.some((userId) =>
          userId.equals(foundProfile._id)
        )
      ) {
        canAccessFullProfile = true;
      }

      const existingRequest = await Request.findOne({
        from: req.session.userId,
        to: id,
        status: "pending",
      });

      if (existingRequest) {
        hasalreadysentrequest = true;
      }
    }

    res.render("profile", {
      profile: foundProfile,
      canAccessFullProfile,
      hasalreadysentrequest,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.post("/interested/:id", isLoggedIn, async (req, res) => {
  const beinglikeduserId = req.params.id; //beingliked
  const beingLikedUser = await User.findById(beinglikeduserId);
  const likeUserId = req.session.userId; //whoisliking
  beingLikedUser.canAccessFullProfileOf.push(likeUserId); //pushing your id to the liked person access full profile list.
  await beingLikedUser.save();
  const newRequest = new Request({
    from: likeUserId,
    to: beinglikeduserId,
  });
  await newRequest.save();

  beingLikedUser.likeRequests.push(newRequest);
  await beingLikedUser.save();
  return res.json({
    message: `successully sent your like request along with your data to ${beingLikedUser.username}`,
  });
});

app.listen(3000, (req, res) => {
  console.log("on port 3000!");
});
