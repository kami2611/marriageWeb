const User = require("./models/user");
const path = require("path");
const Request = require("./models/Request");
const isLoggedIn = require("./middlewares/isLoggedIn");
const findUser = require("./middlewares/findUser");
const requireProfileComplete = require("./middlewares/requireProfileComplete");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const MongoStore = require("connect-mongo");
require("dotenv").config();
const port = process.env.PORT;

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SECRETKEYSESSION,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: { secure: false, httpOnly: true }, // set secure: true if using HTTPS
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
  .connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log("Mongoose Server Started!");
  })
  .catch((err) => {
    console.log("Err mongoose!", err);
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
  if (req.session.userId) {
    // User is already logged in, redirect to home or dashboard
    return res.redirect("/home");
  }
  res.render("register");
});
app.get("/login", (req, res) => {
  if (req.session.userId) {
    // User is already logged in, redirect to home or dashboard
    return res.redirect("/home");
  }
  res.render("login");
});

// Place this after session and before your protected routes
app.use((req, res, next) => {
  const openPaths = [
    "/account/edit",
    "/logout",
    "/register",
    "/login",
    "/",
    "/home",
  ];
  if (
    openPaths.includes(req.path) ||
    req.path.startsWith("/css") ||
    req.path.startsWith("/js") ||
    req.path.startsWith("/imgs")
  ) {
    return next();
  }
  requireProfileComplete(req, res, next);
});

app.post("/register", async (req, res) => {
  const { username, password, passcode } = req.body;

  // Check passcode
  if (passcode != process.env.PASSCODE) {
    return res.render("register", {
      error: "Invalid passcode, please try again.",
    });
  }

  // Check password length
  if (!password || password.length < 5) {
    return res.render("register", {
      error: "Password must be at least 5 characters long.",
    });
  }

  // Check unique username
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render("register", {
      error: "Username already exists. Please choose another or Login.",
    });
  }

  // All good, proceed with registration
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();
  req.session.userId = newUser._id;
  req.session.user = newUser;
  return res.redirect(
    "/account/edit?msg=Please complete your profile to continue."
  );
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
    const redirectUrl = req.session.returnTo || "/home";
    delete req.session.returnTo;
    // return res.json("Login successful");
    return res.json({ success: true, redirect: redirectUrl });
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
  // Get message from query param if present
  const msg = req.query.msg || null;
  res.render("account/edit", { userData, msg });
});
app.post(
  "/account/edit",
  isLoggedIn,
  findUser,
  upload.single("profilePic"),
  async (req, res) => {
    console.log("req.body", req.body);
    const {
      name,
      adress,
      city,
      state,
      country,
      contact,
      gender,
      religion,
      caste,
      age,
      eyeColor,
      hairColor,
      complexion,
      build,
      height,
      languagesSpoken,
      education,
      nationality,
      ethnicity,
      maritalStatus,
      disability,
      disabilityDetail,
      smoker,
      bornMuslim,
      islamicSect,
      work,
      waliMyContactDetails,
      whoCompletedProfile,
      siblings,
      birthPlace,
    } = req.body;
    const user = req.userData;
    if (req.file) {
      if (user.profilePic?.public_id) {
        await cloudinary.uploader.destroy(user.profilePic.public_id);
      }

      user.profilePic = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    // Update fields if they exist
    user.name = name || user.name;
    user.adress = adress || user.adress;
    user.state = state || user.state;
    user.country = country || user.country;
    user.city = city || user.city;
    user.contact = contact || user.contact;
    user.gender = gender || user.gender;
    user.religion = religion || user.religion;
    user.age = age || user.age;
    user.caste = caste || user.caste;

    // New fields
    user.eyeColor = eyeColor || user.eyeColor;
    user.hairColor = hairColor || user.hairColor;
    user.complexion = complexion || user.complexion;
    user.build = build || user.build;
    user.height = height || user.height;
    // Handle languagesSpoken as array
    user.languagesSpoken = languagesSpoken
      ? Array.isArray(languagesSpoken)
        ? languagesSpoken
        : languagesSpoken
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
      : [];
    user.education = education || user.education;
    user.nationality = nationality || user.nationality;
    user.ethnicity = ethnicity || user.ethnicity;
    // Boolean fields from select (string "true"/"false")
    user.maritalStatus =
      typeof maritalStatus !== "undefined" && maritalStatus !== ""
        ? maritalStatus === "true"
        : user.maritalStatus;
    // Disability: if "yes", use detail, else "no"
    user.disability =
      disability === "yes"
        ? disabilityDetail && disabilityDetail.trim()
          ? disabilityDetail.trim()
          : "yes"
        : "no";
    user.smoker =
      typeof smoker !== "undefined" && smoker !== ""
        ? smoker === "true"
        : user.smoker;
    user.bornMuslim =
      typeof bornMuslim !== "undefined" && bornMuslim !== ""
        ? bornMuslim === "true"
        : user.bornMuslim;
    user.islamicSect = islamicSect || user.islamicSect;
    user.work = work || user.work;
    user.waliMyContactDetails =
      waliMyContactDetails || user.waliMyContactDetails;
    user.whoCompletedProfile = whoCompletedProfile || user.whoCompletedProfile;
    user.siblings =
      typeof siblings !== "undefined" && siblings !== ""
        ? Number(siblings)
        : user.siblings;
    user.birthPlace = birthPlace || user.birthPlace;

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
    populate: [{ path: "from", model: "User" }],
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
  // Pagination params
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Extract filter parameters
  const { gender, minAge, maxAge, city, religion, caste } = req.query;

  // Build filter object
  const filter = {};
  if (req.session.userId) {
    filter._id = { $ne: req.session.userId };
  }
  if (gender) filter.gender = gender;
  if (city) filter.city = { $regex: new RegExp(city, "i") };
  if (religion) filter.religion = religion;
  if (caste) filter.caste = { $regex: new RegExp(caste, "i") };
  if (minAge || maxAge) {
    filter.age = {};
    if (minAge) filter.age.$gte = parseInt(minAge);
    if (maxAge) filter.age.$lte = parseInt(maxAge);
  }

  try {
    const totalProfiles = await User.countDocuments(filter);
    const profiles = await User.find(filter).skip(skip).limit(limit);

    const activeFilters = {
      gender,
      minAge,
      maxAge,
      city,
      religion,
      caste,
    };

    const totalPages = Math.ceil(totalProfiles / limit);

    return res.render("profiles", {
      profiles,
      filters: Object.keys(req.query).length > 0 ? activeFilters : null,
      page,
      totalPages,
      totalProfiles,
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
    let hasalreadysentrequest = false;

    // If admin, always grant full access
    if (req.session.isAdmin) {
      canAccessFullProfile = true;
    } else if (req.session.userId) {
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
      user: req.session.user, // if you use it
      isAdmin: req.session.isAdmin, // <-- add this
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
app.get("/admin", (req, res) => {
  res.render("admin/login");
});
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true; // Set admin session
    return res.redirect("/admin/dashboard");
  }
  return res.render("admin/login", { error: "Invalid credentials" });
});
app.get("/admin/dashboard", async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/admin");
  }
  const users = await User.find({});
  res.render("admin/dashboard", { users });
});
app.post("/admin/user/:id/edit", async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const { id } = req.params;
  const allowedFields = [
    "name",
    "age",
    "gender",
    "country",
    "state",
    "city",
    "contact",
    "religion",
    "caste",
    "adress",
  ];
  const update = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  });
  try {
    await User.findByIdAndUpdate(id, update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});
app.post("/admin/user/:id/delete", async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    // Optionally: delete related requests, images, etc.
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});
app.post("/admin/user/add", async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const {
    password,
    name,
    work,
    age,
    gender,
    country,
    state,
    city,
    contact,
    religion,
    caste,
    adress,
    eyeColor,
    hairColor,
    complexion,
    build,
    height,
    languagesSpoken,
    education,
    nationality,
    ethnicity,
    maritalStatus,
    disability,
    disabilityDetail,
    smoker,
    bornMuslim,
    islamicSect,
    prays,
    celebratesMilaad,
    celebrateKhatams,
    islamIsImportantToMeInfo,
    acceptSomeoneWithChildren,
    acceptADivorcedPerson,
    agreesWithPolygamy,
    acceptAWidow,
    AcceptSomeoneWithBeard,
    AcceptSomeoneWithHijab,
    ConsiderARevert,
    livingArrangementsAfterMarriage,
    futurePlans,
    describeNature,
    QualitiesThatYouCanBringToYourMarriage,
    fatherName,
    motherName,
    fatherProfession,
    aboutMe,
    hobbies,
    willingToRelocate,
    preferredAgeRange,
    preferredHeightRange,
    preferredCaste,
    preferredEthnicity,
    allowParnterToWork,
    allowPartnerToStudy,
    acceptSomeoneInOtherCountry,
    qualitiesYouNeedInYourPartner,
    lookingForASpouseThatIs,
    willingToSharePhotosUponRequest,
    willingToMeetUpOutside,
    whoCompletedProfile,
    waliMyContactDetails,
    siblings, // <-- add this
    birthPlace, // <-- add this
  } = req.body;

  if (!gender || !password)
    return res.json({ error: "Gender and password required" });

  // Generate username
  const count = await User.countDocuments({ gender });
  let username = "";
  if (gender === "male") {
    username = `M${count + 1}`;
  } else if (gender === "female") {
    username = `F${count + 1}`;
  } else {
    username = `U${count + 1}`;
  }

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.json({ error: "Username already exists" });
    const hashedPassword = await bcrypt.hash(password, 12);

    // Parse/convert fields as needed
    const langs = languagesSpoken
      ? Array.isArray(languagesSpoken)
        ? languagesSpoken
        : languagesSpoken
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
      : [];
    const qualities = QualitiesThatYouCanBringToYourMarriage
      ? QualitiesThatYouCanBringToYourMarriage.split(",")
          .map((q) => q.trim())
          .filter(Boolean)
      : [];
    const hobbiesArr = hobbies
      ? hobbies
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    const qualitiesNeeded = qualitiesYouNeedInYourPartner
      ? qualitiesYouNeedInYourPartner
          .split(",")
          .map((q) => q.trim())
          .filter(Boolean)
      : [];

    const user = new User({
      username,
      password: hashedPassword,
      name,
      work,
      age,
      gender,
      country,
      state,
      city,
      contact,
      religion,
      caste,
      adress,
      eyeColor,
      hairColor,
      complexion,
      build,
      height,
      languagesSpoken: langs,
      education,
      nationality,
      ethnicity,
      maritalStatus: maritalStatus === "true",
      disability:
        disability === "yes"
          ? disabilityDetail && disabilityDetail.trim()
            ? disabilityDetail.trim()
            : "yes"
          : "no",
      smoker: smoker === "true",
      bornMuslim: bornMuslim === "true",
      islamicSect,
      prays: prays === "true",
      celebratesMilaad: celebratesMilaad === "true",
      celebrateKhatams: celebrateKhatams === "true",
      islamIsImportantToMeInfo,
      acceptSomeoneWithChildren: acceptSomeoneWithChildren === "true",
      acceptADivorcedPerson: acceptADivorcedPerson === "true",
      agreesWithPolygamy: agreesWithPolygamy === "true",
      acceptAWidow: acceptAWidow === "true",
      AcceptSomeoneWithBeard: AcceptSomeoneWithBeard === "true",
      AcceptSomeoneWithHijab: AcceptSomeoneWithHijab === "true",
      ConsiderARevert: ConsiderARevert === "true",
      livingArrangementsAfterMarriage,
      futurePlans,
      describeNature,
      QualitiesThatYouCanBringToYourMarriage: qualities,
      fatherName,
      motherName,
      fatherProfession,
      aboutMe,
      hobbies: hobbiesArr,
      willingToRelocate: willingToRelocate === "true",
      preferredAgeRange,
      preferredHeightRange,
      preferredCaste,
      preferredEthnicity,
      allowParnterToWork: allowParnterToWork === "true",
      allowPartnerToStudy: allowPartnerToStudy === "true",
      acceptSomeoneInOtherCountry: acceptSomeoneInOtherCountry === "true",
      qualitiesYouNeedInYourPartner: qualitiesNeeded,
      lookingForASpouseThatIs,
      willingToSharePhotosUponRequest:
        willingToSharePhotosUponRequest === "true",
      willingToMeetUpOutside: willingToMeetUpOutside === "true",
      whoCompletedProfile,
      waliMyContactDetails,
      siblings:
        typeof siblings !== "undefined" && siblings !== ""
          ? Number(siblings)
          : 0, // <-- add this
      birthPlace: birthPlace || "", // <-- add this
    });

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Add user error:", err);
    res.json({ error: "Failed to add user" });
  }
});
app.get("/admin/user/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send("User not found");

  // Requests where this user is involved
  const Request = require("./models/Request");
  const userRequests = await Request.find({
    $or: [{ from: user._id }, { to: user._id }],
  }).populate("from to");
  const pendingRequests = userRequests.filter((r) => r.status === "pending");
  const acceptedRequests = userRequests.filter((r) => r.status === "accepted");

  res.render("admin/userProfile", {
    user,
    userRequests,
    pendingRequests,
    acceptedRequests,
  });
});
app.get("/admin/usercount", async (req, res) => {
  const gender = req.query.gender;
  if (!gender) return res.json({ count: 0 });
  const count = await User.countDocuments({ gender });
  res.json({ count });
});

app.listen(port, (req, res) => {
  console.log("on port 3000!");
});
