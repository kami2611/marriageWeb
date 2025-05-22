const User = require("./models/user");
const path = require("path");
const Request = require("./models/Request");
const isLoggedIn = require("./middlewares/isLoggedIn");
const findUser = require("./middlewares/findUser");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

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

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "user_profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const upload = multer({ storage });

// Add this middleware after your session setup but before your routes
app.set("view engine", "ejs");

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
  const { username, password, passcode } = req.body;
  // console.log(name, password, city, passcode);
  if (passcode == process.env.PASSCODE) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    req.session.userId = newUser._id;
    req.session.user = newUser;
    return res.redirect("/home");
  } else {
    return res.send("invalid passcode , try again");
  }
});
app.post("/login", async (req, res) => {
  const { username, password, remember } = req.body;
  const foundUser = await User.findOne({ username: username });
  if (!foundUser) {
    return res.json({ error: "username or password is incorrect" });
  }
  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (isMatch) {
    req.session.userId = foundUser._id; // create session
    req.session.user = foundUser;
    if (remember === "true" || remember === true) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie (browser closes = logout)
    }
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
app.post(
  "/account/edit",
  isLoggedIn,
  findUser,
  upload.single("profilePic"),
  async (req, res) => {
    console.log("req.body", req.body);
    const { name, adress, city, contact, gender, religion, caste, age } =
      req.body;
    const user = req.userData;

    if (user.profilePic?.public_id) {
      await cloudinary.uploader.destroy(user.profilePic.public_id);
    }
    user.profilePic = {
      url: req.file.path,
      public_id: req.file.filename,
    };

    // Update fields if they exist
    user.name = name || user.name;
    user.adress = adress || user.adress;
    user.city = city || user.city;
    user.contact = contact || user.contact;
    user.gender = gender || user.gender;
    user.religion = religion || user.religion;
    user.age = age || user.age;
    user.caste = caste || user.caste;

    await user.save();
    res.redirect("/account"); // or wherever you want to redirect
  }
);

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
  return res.redirect("/account/pendingRequests");
  // res.json({ message: "request accepted" });
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
  // res.json({ message: "request rejected" });
  res.redirect("/account/acceptedRequests");
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
  console.log("Profiles route accessed with query:", req.query);

  // Extract filter parameters
  const { gender, minAge, maxAge, city, religion, caste } = req.query;

  // Build filter object
  const filter = {};

  // Add filters only if they exist
  if (gender) filter.gender = gender;
  if (city) filter.city = { $regex: new RegExp(city, "i") }; // Case-insensitive search
  if (religion) filter.religion = religion;
  if (caste) filter.caste = { $regex: new RegExp(caste, "i") }; // Case-insensitive search

  // Handle age range filter
  if (minAge || maxAge) {
    filter.age = {};
    if (minAge) filter.age.$gte = parseInt(minAge);
    if (maxAge) filter.age.$lte = parseInt(maxAge);
  }

  console.log("Applying filters:", filter);

  try {
    // Find profiles with the applied filters
    const profiles = await User.find(filter);
    console.log(`Found ${profiles.length} profiles matching the filters`);

    // Pass the filters to the template for displaying active filters
    const activeFilters = {
      gender,
      minAge,
      maxAge,
      city,
      religion,
      caste,
    };

    return res.render("profiles", {
      profiles,
      filters: Object.keys(req.query).length > 0 ? activeFilters : null,
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).render("error", {
      title: "Error",
      message: "Failed to fetch profiles",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
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
    message: `successully sent your like request`,
  });
});

app.listen(3000, (req, res) => {
  console.log("on port 3000!");
});
