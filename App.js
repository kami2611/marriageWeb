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
const { v4: uuidv4 } = require("uuid");
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
  params: async (req, file) => {
    // Only for /account/edit, user is available as req.userData
    let username = req.userData?.username || "unknown";
    // Get next image number for this user
    let nextImgNum = 1;
    try {
      const result = await cloudinary.search
        .expression(`folder:user_profiles AND public_id:${username}imgs*`)
        .sort_by("public_id", "desc")
        .max_results(100)
        .execute();
      let maxNum = 0;
      result.resources.forEach((img) => {
        const match = img.public_id.match(new RegExp(username + "imgs(\\d+)$"));
        if (match && Number(match[1]) > maxNum) {
          maxNum = Number(match[1]);
        }
      });
      nextImgNum = maxNum + 1;
    } catch (e) {}
    return {
      folder: "user_profiles",
      public_id: `${username}imgs${nextImgNum}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
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
app.post("/account/update", isLoggedIn, findUser, async (req, res) => {
  console.log("Account update request body:", req.body);

  try {
    const user = req.userData;
    const formData = req.body;

    // Basic Info Tab
    if (formData.name) user.name = formData.name;
    if (formData.age !== undefined)
      user.age = parseInt(formData.age) || user.age;
    if (formData.gender) user.gender = formData.gender;
    if (formData.maritalStatus && formData.maritalStatus !== "N/A") {
      user.maritalStatus = formData.maritalStatus; // Handle as string enum
    }
    if (formData.work) user.work = formData.work;
    if (formData.aboutMe) user.aboutMe = formData.aboutMe;

    // Handle hobbies as comma-separated array
    if (formData.hobbies && Array.isArray(formData.hobbies)) {
      user.hobbies = formData.hobbies;
    }

    // Contact & Location Tab
    if (formData.contact) user.contact = formData.contact;
    if (formData.waliMyContactDetails)
      user.waliMyContactDetails = formData.waliMyContactDetails;
    if (formData.adress) user.adress = formData.adress;
    if (formData.city) user.city = formData.city;
    if (formData.state) user.state = formData.state;
    if (formData.country) user.country = formData.country;
    if (formData.nationality) user.nationality = formData.nationality;
    if (formData.birthPlace) user.birthPlace = formData.birthPlace;
    if (formData.willingToRelocate !== undefined)
      user.willingToRelocate =
        formData.willingToRelocate === true ||
        formData.willingToRelocate === "true";

    // Handle languages as array
    if (formData.languagesSpoken && Array.isArray(formData.languagesSpoken)) {
      user.languagesSpoken = formData.languagesSpoken;
    }

    // Physical Appearance Tab
    if (formData.height !== undefined)
      user.height = parseInt(formData.height) || user.height;
    if (formData.build) user.build = formData.build;
    if (formData.eyeColor) user.eyeColor = formData.eyeColor;
    if (formData.hairColor) user.hairColor = formData.hairColor;
    if (formData.complexion) user.complexion = formData.complexion;
    if (formData.ethnicity) user.ethnicity = formData.ethnicity;
    if (formData.disability) user.disability = formData.disability;
    if (formData.smoker !== undefined)
      user.smoker = formData.smoker === true || formData.smoker === "true";

    // Religion & Faith Tab
    if (formData.religion) user.religion = formData.religion;
    if (formData.caste) user.caste = formData.caste;
    if (formData.islamicSect) user.islamicSect = formData.islamicSect;
    if (formData.bornMuslim !== undefined)
      user.bornMuslim =
        formData.bornMuslim === true || formData.bornMuslim === "true";
    if (formData.prays !== undefined)
      user.prays = formData.prays === true || formData.prays === "true";
    if (formData.celebratesMilaad !== undefined)
      user.celebratesMilaad =
        formData.celebratesMilaad === true ||
        formData.celebratesMilaad === "true";
    if (formData.celebrateKhatams !== undefined)
      user.celebrateKhatams =
        formData.celebrateKhatams === true ||
        formData.celebrateKhatams === "true";
    if (formData.islamIsImportantToMeInfo)
      user.islamIsImportantToMeInfo = formData.islamIsImportantToMeInfo;

    // Family & Background Tab
    if (formData.fatherName) user.fatherName = formData.fatherName;
    if (formData.motherName) user.motherName = formData.motherName;
    if (formData.fatherProfession)
      user.fatherProfession = formData.fatherProfession;
    if (formData.siblings !== undefined)
      user.siblings = parseInt(formData.siblings) || user.siblings;
    if (formData.livingArrangementsAfterMarriage)
      user.livingArrangementsAfterMarriage =
        formData.livingArrangementsAfterMarriage;
    if (formData.futurePlans) user.futurePlans = formData.futurePlans;
    if (formData.whoCompletedProfile)
      user.whoCompletedProfile = formData.whoCompletedProfile;
    if (formData.describeNature) user.describeNature = formData.describeNature;
    if (formData.anySpecialInformationPeopleShouldKnow)
      user.anySpecialInformationPeopleShouldKnow =
        formData.anySpecialInformationPeopleShouldKnow;
    if (
      formData.qualitiesYouNeedInYourPartner &&
      Array.isArray(formData.qualitiesYouNeedInYourPartner)
    ) {
      user.qualitiesYouNeedInYourPartner =
        formData.qualitiesYouNeedInYourPartner;
    }
    // Handle qualities as array
    if (
      formData.QualitiesThatYouCanBringToYourMarriage &&
      Array.isArray(formData.QualitiesThatYouCanBringToYourMarriage)
    ) {
      user.QualitiesThatYouCanBringToYourMarriage =
        formData.QualitiesThatYouCanBringToYourMarriage;
    }

    // Handle dynamic education array
    if (formData.education && Array.isArray(formData.education)) {
      user.education = formData.education.filter(
        (edu) => edu && (edu.title || edu.institute || edu.year)
      );
    }

    // Handle dynamic children array
    if (formData.children && Array.isArray(formData.children)) {
      user.children = formData.children.filter(
        (child) => child && (child.name || child.age || child.livingLocation)
      );
    }

    // Partner Preferences Tab
    if (formData.preferredAgeRange)
      user.preferredAgeRange = formData.preferredAgeRange;
    if (formData.preferredHeightRange)
      user.preferredHeightRange = formData.preferredHeightRange;
    if (formData.preferredCaste) user.preferredCaste = formData.preferredCaste;
    if (formData.preferredEthnicity)
      user.preferredEthnicity = formData.preferredEthnicity;
    if (formData.allowParnterToWork !== undefined)
      user.allowParnterToWork =
        formData.allowParnterToWork === true ||
        formData.allowParnterToWork === "true";
    if (formData.allowPartnerToStudy !== undefined)
      user.allowPartnerToStudy =
        formData.allowPartnerToStudy === true ||
        formData.allowPartnerToStudy === "true";

    // Acceptance preferences
    if (formData.acceptSomeoneWithChildren !== undefined)
      user.acceptSomeoneWithChildren =
        formData.acceptSomeoneWithChildren === true ||
        formData.acceptSomeoneWithChildren === "true";
    if (formData.acceptADivorcedPerson !== undefined)
      user.acceptADivorcedPerson =
        formData.acceptADivorcedPerson === true ||
        formData.acceptADivorcedPerson === "true";
    if (formData.acceptAWidow !== undefined)
      user.acceptAWidow =
        formData.acceptAWidow === true || formData.acceptAWidow === "true";
    if (formData.agreesWithPolygamy !== undefined)
      user.agreesWithPolygamy =
        formData.agreesWithPolygamy === true ||
        formData.agreesWithPolygamy === "true";
    if (formData.AcceptSomeoneWithBeard !== undefined)
      user.AcceptSomeoneWithBeard =
        formData.AcceptSomeoneWithBeard === true ||
        formData.AcceptSomeoneWithBeard === "true";
    if (formData.AcceptSomeoneWithHijab !== undefined)
      user.AcceptSomeoneWithHijab =
        formData.AcceptSomeoneWithHijab === true ||
        formData.AcceptSomeoneWithHijab === "true";
    if (formData.ConsiderARevert !== undefined)
      user.ConsiderARevert =
        formData.ConsiderARevert === true ||
        formData.ConsiderARevert === "true";
    if (formData.acceptSomeoneInOtherCountry !== undefined)
      user.acceptSomeoneInOtherCountry =
        formData.acceptSomeoneInOtherCountry === true ||
        formData.acceptSomeoneInOtherCountry === "true";
    if (formData.willingToSharePhotosUponRequest !== undefined)
      user.willingToSharePhotosUponRequest =
        formData.willingToSharePhotosUponRequest === true ||
        formData.willingToSharePhotosUponRequest === "true";
    if (formData.willingToMeetUpOutside !== undefined)
      user.willingToMeetUpOutside =
        formData.willingToMeetUpOutside === true ||
        formData.willingToMeetUpOutside === "true";
    if (formData.willingToConsiderANonUkCitizen !== undefined)
      user.willingToConsiderANonUkCitizen =
        formData.willingToConsiderANonUkCitizen === true ||
        formData.willingToConsiderANonUkCitizen === "true";
    // Save the updated user
    await user.save();

    // Update session user data
    req.session.user = user;

    console.log("User profile updated successfully:", user.username);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Account update error:", error);
    res.json({ error: `Failed to update profile: ${error.message}` });
  }
});

// app.use((req, res, next) => {
//   const openPaths = [
//     "/account/info",
//     "/logout",
//     "/register",
//     "/login",
//     "/account/update",
//   ];
//   if (
//     openPaths.includes(req.path) ||
//     req.path.startsWith("/css") ||
//     req.path.startsWith("/js") ||
//     req.path.startsWith("/imgs")
//   ) {
//     return next();
//   }
//   requireProfileComplete(req, res, next);
// });

app.post("/register", async (req, res) => {
  console.log("Register request body:", req.body); // Debug log

  const { username, password, passcode, gender } = req.body;

  // Check if required fields are present
  if (!username || !password || !passcode || !gender) {
    return res.render("register", {
      error: "All fields are required. Please fill out the form completely.",
    });
  }

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

  // Check if gender is valid
  if (gender !== "male" && gender !== "female") {
    return res.render("register", {
      error: "Please select a valid gender.",
    });
  }

  // Check unique username (should be auto-generated, but double check)
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render("register", {
      error: "Username already exists. Please refresh and try again.",
    });
  }

  // All good, proceed with registration
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      username,
      password: hashedPassword,
      gender, // Save the gender immediately
    });
    await newUser.save();
    req.session.userId = newUser._id;
    req.session.user = newUser;
    return res.redirect(
      "/account/info?msg=Please complete your profile to continue."
    );
  } catch (error) {
    console.error("Registration error:", error);
    return res.render("register", {
      error: "Registration failed. Please try again.",
    });
  }
});
app.post("/login", async (req, res) => {
  const { username, password, remember } = req.body;
  console.log("received");

  // Check if it's admin login first
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    req.session.adminUsername = username;
    // Create a user object for admin with isAdmin flag
    req.session.user = {
      username: username,
      isAdmin: true,
    };

    if (remember === "true" || remember === true) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie
    }

    return res.json({ success: true, redirect: "/admin/dashboard" });
  }

  // If not admin, try user login
  const foundUser = await User.findOne({ username: username });
  if (!foundUser) {
    return res.json({ error: "username or password is incorrect" });
  }

  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (isMatch) {
    req.session.userId = foundUser._id;
    // Ensure user object has isAdmin flag
    const userObj = foundUser.toObject();
    userObj.isAdmin = false; // Regular users are not admin
    req.session.user = userObj;

    if (remember === "true" || remember === true) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie (browser closes = logout)
    }

    const redirectUrl = req.session.returnTo || "/home";
    delete req.session.returnTo;

    return res.json({ success: true, redirect: redirectUrl });
  } else {
    return res.json({ error: "username or password is incorrect" });
  }
});
app.get("/logout", (req, res) => {
  const wasAdmin = req.session.isAdmin;

  req.session.destroy((err) => {
    if (err) {
      return res.send("error logging out");
    }
    res.clearCookie("connect.sid");

    // Redirect to appropriate page based on user type
    if (wasAdmin) {
      res.redirect("/login"); // or "/admin" if you want
    } else {
      res.redirect("/home");
    }
  });
});

app.get(["/account", "/account/info"], isLoggedIn, findUser, (req, res) => {
  const accountInfo = req.userData;
  res.render("account/info", { accountInfo });
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
  try {
    const requestId = req.params.id;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if current user is the recipient
    if (request.to.toString() !== req.session.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update request status
    request.status = "accepted";
    await request.save();

    // Get both users
    const requestFromUser = await User.findById(request.from);
    const requestToUser = await User.findById(request.to);

    // Grant MUTUAL access (both users can see each other's full profiles)
    if (!requestFromUser.canAccessFullProfileOf.includes(requestToUser._id)) {
      requestFromUser.canAccessFullProfileOf.push(requestToUser._id);
    }

    if (!requestToUser.canAccessFullProfileOf.includes(requestFromUser._id)) {
      requestToUser.canAccessFullProfileOf.push(requestFromUser._id);
    }

    await requestFromUser.save();
    await requestToUser.save();

    return res.redirect("/account/pendingRequests");
  } catch (error) {
    console.error("Error accepting request:", error);
    return res.status(500).json({ error: "Failed to accept request" });
  }
});
// Replace the existing /requests/:id/reject route
app.post("/requests/:id/reject", isLoggedIn, async (req, res) => {
  try {
    const requestId = req.params.id;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Check if current user is the recipient
    if (request.to.toString() !== req.session.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update request status
    request.status = "rejected";
    await request.save();

    // Remove sender's access to receiver's profile
    // (Receiver had granted access for sender to be seen during decision)
    const requestToUser = await User.findById(request.to);
    const requestFromUser = await User.findById(request.from);

    // Remove sender from receiver's access list
    requestToUser.canAccessFullProfileOf.pull(request.from);

    await requestToUser.save();
    await requestFromUser.save();

    return res.redirect("/account/pendingRequests");
  } catch (error) {
    console.error("Error rejecting request:", error);
    return res.status(500).json({ error: "Failed to reject request" });
  }
});

// Update the existing /requests/:id/cancel route
// app.post("api/requests/:id/cancel", isLoggedIn, async (req, res) => {
//   try {
//     const requestId = req.params.id;
//     const requestToCancel = await Request.findById(requestId);
//     console.log("request to cancel: ", requestToCancel);

//     if (!requestToCancel) {
//       return res
//         .status(404)
//         .json({ success: false, error: "Request not found" });
//     }

//     // Check if current user is the sender
//     if (requestToCancel.from.toString() !== req.session.userId) {
//       return res.status(403).json({ success: false, error: "Unauthorized" });
//     }

//     const fromUserId = requestToCancel.from.toString();
//     const toUserId = requestToCancel.to.toString();

//     const fromUser = await User.findById(fromUserId);
//     const toUser = await User.findById(toUserId);

//     // Remove each other from access lists
//     if (fromUser) {
//       fromUser.canAccessFullProfileOf.pull(toUserId);
//       await fromUser.save();
//     }

//     if (toUser) {
//       toUser.canAccessFullProfileOf.pull(fromUserId);
//       toUser.likeRequests.pull(requestId); // Remove from receiver's request list
//       await toUser.save();
//     }

//     // Delete the request
//     await Request.findByIdAndDelete(requestId);

//     res.json({
//       success: true,
//       message: "Request cancelled and access revoked from both sides.",
//     });
//   } catch (error) {
//     console.error("Error cancelling request:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to cancel request",
//     });
//   }
// });
// Add this new API route for cancelling requests
app.post("/api/requests/:requestId/cancel", isLoggedIn, async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestToCancel = await Request.findById(requestId);

    if (!requestToCancel) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }

    // Check if current user is the sender
    if (requestToCancel.from.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const fromUserId = requestToCancel.from.toString();
    const toUserId = requestToCancel.to.toString();

    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    // Remove each other from access lists
    if (fromUser) {
      fromUser.canAccessFullProfileOf.pull(toUserId);
      await fromUser.save();
    }

    if (toUser) {
      toUser.canAccessFullProfileOf.pull(fromUserId);
      toUser.likeRequests.pull(requestId);
      await toUser.save();
    }

    // Delete the request
    await Request.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: "Request cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel request",
    });
  }
});
app.get("/profiles", async (req, res) => {
  // Pagination params
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Extract filter parameters
  const { gender, minAge, maxAge, minHeight, maxHeight, city, nationality } =
    req.query;

  // Build filter object
  const filter = {};
  if (req.session.userId) {
    filter._id = { $ne: req.session.userId };
  }

  if (gender) filter.gender = gender;
  if (city) filter.city = { $regex: new RegExp(city, "i") };
  if (nationality) filter.nationality = nationality;

  // Age range filter
  if (minAge || maxAge) {
    filter.age = {};
    if (minAge) filter.age.$gte = parseInt(minAge);
    if (maxAge) filter.age.$lte = parseInt(maxAge);
  }

  // Height range filter - FIXED VERSION
  if (minHeight || maxHeight) {
    filter.height = {};
    if (minHeight) {
      const minHeightNum = parseFloat(minHeight);
      if (!isNaN(minHeightNum)) {
        filter.height.$gte = minHeightNum;
      }
    }
    if (maxHeight) {
      const maxHeightNum = parseFloat(maxHeight);
      if (!isNaN(maxHeightNum)) {
        filter.height.$lte = maxHeightNum;
      }
    }
  }

  // Debug log to check filters
  console.log("Height filters applied:", {
    minHeight,
    maxHeight,
    heightFilter: filter.height,
  });

  try {
    const totalProfiles = await User.countDocuments(filter);
    const profiles = await User.find(filter).skip(skip).limit(limit);

    const activeFilters = {
      gender,
      minAge,
      maxAge,
      minHeight,
      maxHeight,
      city,
      nationality,
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

      // Check if current user can access this profile's private information
      if (
        loggedUser.canAccessFullProfileOf.some((userId) =>
          userId.equals(foundProfile._id)
        )
      ) {
        canAccessFullProfile = true;
      }

      // Check if user has already sent a pending request
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
      user: req.session.user,
      isAdmin: req.session.isAdmin,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// app.post("/interested/:id", isLoggedIn, async (req, res) => {
//   try {
//     const beinglikeduserId = req.params.id; // receiver
//     const likeUserId = req.session.userId; // sender

//     // Check if target user exists
//     const beingLikedUser = await User.findById(beinglikeduserId);
//     if (!beingLikedUser) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Check if request already exists
//     const existingRequest = await Request.findOne({
//       from: likeUserId,
//       to: beinglikeduserId,
//       status: "pending",
//     });

//     if (existingRequest) {
//       return res.json({ error: "Request already sent" });
//     }

//     // ONLY grant access to sender's profile to receiver
//     // (Receiver can see sender's info to make decision)
//     if (!beingLikedUser.canAccessFullProfileOf.includes(likeUserId)) {
//       beingLikedUser.canAccessFullProfileOf.push(likeUserId);
//     }

//     // Create new request
//     const newRequest = new Request({
//       from: likeUserId,
//       to: beinglikeduserId,
//       status: "pending", // explicitly set as pending
//     });

//     await newRequest.save();

//     // Add request to receiver's list
//     if (!beingLikedUser.likeRequests.includes(newRequest._id)) {
//       beingLikedUser.likeRequests.push(newRequest);
//     }

//     await beingLikedUser.save();

//     return res.json({
//       message: "Successfully sent your like request",
//     });
//   } catch (error) {
//     console.error("Error sending request:", error);
//     return res.status(500).json({
//       error: "Failed to send request. Please try again.",
//     });
//   }
// });
// ...existing code...

app.post("/interested/:id", isLoggedIn, async (req, res) => {
  try {
    const beinglikeduserId = req.params.id; // receiver
    const likeUserId = req.session.userId; // sender

    // Check if sender's profile is complete BEFORE sending request
    const senderUser = await User.findById(likeUserId);

    // Use the same profile completion logic from requireProfileComplete.js
    const isProfileComplete =
      senderUser &&
      senderUser.age &&
      senderUser.name &&
      senderUser.gender &&
      senderUser.religion &&
      senderUser.nationality &&
      senderUser.country &&
      senderUser.state &&
      senderUser.city &&
      senderUser.contact &&
      senderUser.adress &&
      senderUser.height &&
      senderUser.complexion &&
      senderUser.build &&
      senderUser.eyeColor &&
      senderUser.hairColor &&
      senderUser.ethnicity &&
      senderUser.maritalStatus &&
      senderUser.work &&
      senderUser.islamicSect &&
      senderUser.smoker !== undefined &&
      senderUser.bornMuslim !== undefined &&
      senderUser.prays !== undefined &&
      senderUser.celebratesMilaad !== undefined &&
      senderUser.celebrateKhatams !== undefined &&
      senderUser.livingArrangementsAfterMarriage &&
      senderUser.futurePlans &&
      senderUser.fatherName &&
      senderUser.motherName &&
      senderUser.fatherProfession &&
      senderUser.aboutMe &&
      senderUser.willingToRelocate !== undefined &&
      senderUser.preferredAgeRange &&
      senderUser.preferredHeightRange &&
      senderUser.preferredCaste &&
      senderUser.preferredEthnicity &&
      senderUser.allowParnterToWork !== undefined &&
      senderUser.allowPartnerToStudy !== undefined &&
      senderUser.acceptSomeoneInOtherCountry !== undefined &&
      senderUser.lookingForASpouseThatIs &&
      senderUser.willingToSharePhotosUponRequest !== undefined &&
      senderUser.willingToMeetUpOutside !== undefined &&
      senderUser.whoCompletedProfile &&
      senderUser.birthPlace &&
      senderUser.siblings !== undefined &&
      senderUser.describeNature &&
      senderUser.acceptSomeoneWithChildren !== undefined &&
      senderUser.acceptADivorcedPerson !== undefined &&
      senderUser.agreesWithPolygamy !== undefined &&
      senderUser.acceptAWidow !== undefined &&
      senderUser.AcceptSomeoneWithBeard !== undefined &&
      senderUser.AcceptSomeoneWithHijab !== undefined &&
      senderUser.ConsiderARevert !== undefined &&
      senderUser.willingToConsiderANonUkCitizen !== undefined &&
      senderUser.languagesSpoken &&
      senderUser.languagesSpoken.length > 0 &&
      senderUser.hobbies &&
      senderUser.hobbies.length > 0 &&
      senderUser.QualitiesThatYouCanBringToYourMarriage &&
      senderUser.QualitiesThatYouCanBringToYourMarriage.length > 0 &&
      senderUser.qualitiesYouNeedInYourPartner &&
      senderUser.qualitiesYouNeedInYourPartner.length > 0;

    if (!isProfileComplete) {
      return res.status(400).json({
        error: "incomplete_profile",
        message:
          "You must complete your profile before sending requests to others.",
      });
    }

    // Check if target user exists
    const beingLikedUser = await User.findById(beinglikeduserId);
    if (!beingLikedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if request already exists
    const existingRequest = await Request.findOne({
      from: likeUserId,
      to: beinglikeduserId,
      status: "pending",
    });

    if (existingRequest) {
      return res.json({ error: "Request already sent" });
    }

    // ONLY grant access to sender's profile to receiver
    // (Receiver can see sender's info to make decision)
    if (!beingLikedUser.canAccessFullProfileOf.includes(likeUserId)) {
      beingLikedUser.canAccessFullProfileOf.push(likeUserId);
    }

    // Create new request
    const newRequest = new Request({
      from: likeUserId,
      to: beinglikeduserId,
      status: "pending", // explicitly set as pending
    });

    await newRequest.save();

    // Add request to receiver's list
    if (!beingLikedUser.likeRequests.includes(newRequest._id)) {
      beingLikedUser.likeRequests.push(newRequest);
    }

    await beingLikedUser.save();

    return res.json({
      message: "Successfully sent your like request",
    });
  } catch (error) {
    console.error("Error sending request:", error);
    return res.status(500).json({
      error: "Failed to send request. Please try again.",
    });
  }
});

// ...existing code...
app.get("/admin", (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin/dashboard");
  }
  // Redirect to main login page instead of rendering separate admin login
  res.redirect("/login");
});
app.get("/admin/addUser", (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");
  res.render("admin/addUser");
});
app.get("/admin/dashboard", async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/admin");
  }

  try {
    // Get all users
    const users = await User.find({}).sort({ createdAt: -1, _id: -1 });

    // Calculate stats
    const totalUsers = users.length;
    const activeUsers = users.filter(
      (user) =>
        user.name && user.age && user.city && (user.contact || user.aboutMe)
    ).length;

    // Count users created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newThisMonth = users.filter(
      (user) => user.createdAt && new Date(user.createdAt) >= startOfMonth
    ).length;

    // Count accepted requests (matches)
    const acceptedRequests = await Request.countDocuments({
      status: "accepted",
    });
    const matchesMade = Math.floor(acceptedRequests / 2); // Each match involves 2 people

    const stats = {
      totalUsers,
      activeUsers,
      matchesMade,
      newThisMonth,
    };

    res.render("admin/dashboard", { users, stats });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.render("admin/dashboard", {
      users: [],
      stats: { totalUsers: 0, activeUsers: 0, matchesMade: 0, newThisMonth: 0 },
    });
  }
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

  console.log("Received user data:", req.body); // Debug log

  const {
    username, // This should come from frontend now
    password,
    willingToConsiderANonUkCitizen,
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
    adress, // Note: using 'adress' to match your schema
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
    siblings,
    birthPlace,
    children,
    anySpecialInformationPeopleShouldKnow,
  } = req.body;

  // Validate required fields
  if (!password) {
    return res.json({ error: "Password is required" });
  }

  if (!username) {
    return res.json({
      error: "Username is required (should be auto-generated)",
    });
  }

  try {
    // Check if username already exists
    const existing = await User.findOne({ username });
    if (existing) {
      return res.json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Process arrays (they should already be arrays from frontend)
    const languagesSpokenArr = Array.isArray(languagesSpoken)
      ? languagesSpoken
      : [];
    const qualitiesArr = Array.isArray(QualitiesThatYouCanBringToYourMarriage)
      ? QualitiesThatYouCanBringToYourMarriage
      : [];
    const hobbiesArr = Array.isArray(hobbies) ? hobbies : [];
    const qualitiesNeededArr = Array.isArray(qualitiesYouNeedInYourPartner)
      ? qualitiesYouNeedInYourPartner
      : [];

    // Process education and children arrays (they should already be properly formatted)
    const educationArr = Array.isArray(education) ? education : [];
    const childrenArr = Array.isArray(children) ? children : [];

    // Create new user object
    const userData = {
      username,
      password: hashedPassword,
      gender,
    };

    // Add optional fields only if they exist and are not empty
    if (name) userData.name = name;
    if (work) userData.work = work;
    if (age) userData.age = parseInt(age);
    if (country) userData.country = country;
    if (state) userData.state = state;
    if (city) userData.city = city;
    if (contact) userData.contact = contact;
    if (religion) userData.religion = religion;
    if (caste) userData.caste = caste;
    if (adress) userData.adress = adress;
    if (eyeColor) userData.eyeColor = eyeColor;
    if (hairColor) userData.hairColor = hairColor;
    if (complexion) userData.complexion = complexion;
    if (build) userData.build = build;
    if (height) userData.height = parseInt(height);
    if (nationality) userData.nationality = nationality;
    if (ethnicity) userData.ethnicity = ethnicity;
    if (islamicSect) userData.islamicSect = islamicSect;
    if (islamIsImportantToMeInfo)
      userData.islamIsImportantToMeInfo = islamIsImportantToMeInfo;
    if (livingArrangementsAfterMarriage)
      userData.livingArrangementsAfterMarriage =
        livingArrangementsAfterMarriage;
    if (futurePlans) userData.futurePlans = futurePlans;
    if (describeNature) userData.describeNature = describeNature;
    if (fatherName) userData.fatherName = fatherName;
    if (motherName) userData.motherName = motherName;
    if (fatherProfession) userData.fatherProfession = fatherProfession;
    if (aboutMe) userData.aboutMe = aboutMe;
    if (preferredAgeRange) userData.preferredAgeRange = preferredAgeRange;
    if (preferredHeightRange)
      userData.preferredHeightRange = preferredHeightRange;
    if (preferredCaste) userData.preferredCaste = preferredCaste;
    if (preferredEthnicity) userData.preferredEthnicity = preferredEthnicity;
    if (lookingForASpouseThatIs)
      userData.lookingForASpouseThatIs = lookingForASpouseThatIs;
    if (whoCompletedProfile) userData.whoCompletedProfile = whoCompletedProfile;
    if (waliMyContactDetails)
      userData.waliMyContactDetails = waliMyContactDetails;
    if (birthPlace) userData.birthPlace = birthPlace;
    if (anySpecialInformationPeopleShouldKnow)
      userData.anySpecialInformationPeopleShouldKnow =
        anySpecialInformationPeopleShouldKnow;
    if (disability && disability !== "no") userData.disability = disability;

    // Handle numeric fields
    if (siblings !== undefined && siblings !== "")
      userData.siblings = parseInt(siblings) || 0;

    // Handle boolean fields - convert properly
    if (maritalStatus && maritalStatus !== "N/A") {
      userData.maritalStatus = maritalStatus;
    }
    if (smoker !== undefined)
      userData.smoker = smoker === true || smoker === "true";
    if (bornMuslim !== undefined)
      userData.bornMuslim = bornMuslim === true || bornMuslim === "true";
    if (prays !== undefined)
      userData.prays = prays === true || prays === "true";
    if (celebratesMilaad !== undefined)
      userData.celebratesMilaad =
        celebratesMilaad === true || celebratesMilaad === "true";
    if (celebrateKhatams !== undefined)
      userData.celebrateKhatams =
        celebrateKhatams === true || celebrateKhatams === "true";
    if (willingToRelocate !== undefined)
      userData.willingToRelocate =
        willingToRelocate === true || willingToRelocate === "true";
    if (allowParnterToWork !== undefined)
      userData.allowParnterToWork =
        allowParnterToWork === true || allowParnterToWork === "true";
    if (allowPartnerToStudy !== undefined)
      userData.allowPartnerToStudy =
        allowPartnerToStudy === true || allowPartnerToStudy === "true";
    if (acceptSomeoneWithChildren !== undefined)
      userData.acceptSomeoneWithChildren =
        acceptSomeoneWithChildren === true ||
        acceptSomeoneWithChildren === "true";
    if (acceptADivorcedPerson !== undefined)
      userData.acceptADivorcedPerson =
        acceptADivorcedPerson === true || acceptADivorcedPerson === "true";
    if (agreesWithPolygamy !== undefined)
      userData.agreesWithPolygamy =
        agreesWithPolygamy === true || agreesWithPolygamy === "true";
    if (acceptAWidow !== undefined)
      userData.acceptAWidow = acceptAWidow === true || acceptAWidow === "true";
    if (AcceptSomeoneWithBeard !== undefined)
      userData.AcceptSomeoneWithBeard =
        AcceptSomeoneWithBeard === true || AcceptSomeoneWithBeard === "true";
    if (AcceptSomeoneWithHijab !== undefined)
      userData.AcceptSomeoneWithHijab =
        AcceptSomeoneWithHijab === true || AcceptSomeoneWithHijab === "true";
    if (ConsiderARevert !== undefined)
      userData.ConsiderARevert =
        ConsiderARevert === true || ConsiderARevert === "true";
    if (acceptSomeoneInOtherCountry !== undefined)
      userData.acceptSomeoneInOtherCountry =
        acceptSomeoneInOtherCountry === true ||
        acceptSomeoneInOtherCountry === "true";
    if (willingToSharePhotosUponRequest !== undefined)
      userData.willingToSharePhotosUponRequest =
        willingToSharePhotosUponRequest === true ||
        willingToSharePhotosUponRequest === "true";
    if (willingToMeetUpOutside !== undefined)
      userData.willingToMeetUpOutside =
        willingToMeetUpOutside === true || willingToMeetUpOutside === "true";
    if (willingToConsiderANonUkCitizen !== undefined)
      userData.willingToConsiderANonUkCitizen =
        willingToConsiderANonUkCitizen === true ||
        willingToConsiderANonUkCitizen === "true";
    // Handle arrays
    if (languagesSpokenArr.length > 0)
      userData.languagesSpoken = languagesSpokenArr;
    if (qualitiesArr.length > 0)
      userData.QualitiesThatYouCanBringToYourMarriage = qualitiesArr;
    if (hobbiesArr.length > 0) userData.hobbies = hobbiesArr;
    if (qualitiesNeededArr.length > 0)
      userData.qualitiesYouNeedInYourPartner = qualitiesNeededArr;
    if (educationArr.length > 0) userData.education = educationArr;
    if (childrenArr.length > 0) userData.children = childrenArr;

    console.log("Creating user with data:", userData); // Debug log

    // Create and save user
    const user = new User(userData);
    await user.save();

    console.log("User created successfully:", user.username); // Debug log
    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("Add user error:", err);
    res.json({ error: `Failed to add user: ${err.message}` });
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
// app.get("/admin/usercount", async (req, res) => {
//   const gender = req.query.gender;
//   if (!gender) return res.json({ count: 0 });
//   const count = await User.countDocuments({ gender });
//   res.json({ count });
// });
app.get("/generate-username", async (req, res) => {
  const { gender } = req.query;
  if (!gender || (gender !== "male" && gender !== "female")) {
    return res.json({ username: "" });
  }
  // Find the highest number for the gender prefix
  const prefix = gender === "male" ? "M" : "F";
  const regex = new RegExp(`^${prefix}(\\d+)$`);
  const users = await User.find({ username: { $regex: regex } }).select(
    "username"
  );
  let maxNum = 0;
  users.forEach((u) => {
    const match = u.username.match(regex);
    if (match && Number(match[1]) > maxNum) {
      maxNum = Number(match[1]);
    }
  });
  const username = `${prefix}${maxNum + 1}`;
  res.json({ username });
});

// Add these routes after your existing admin routes (around line 385, after the generate-username route)

// Edit User Page Route
app.get("/admin/edit-user/:id", async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/admin");
  }

  try {
    const userId = req.params.id;
    const userToEdit = await User.findById(userId);

    if (!userToEdit) {
      return res.status(404).send("User not found");
    }

    res.render("admin/editUser", { userToEdit });
  } catch (error) {
    console.error("Admin edit user error:", error);
    res.redirect("/admin/dashboard");
  }
});

// Update User Route
app.post("/admin/user/update", async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: "Forbidden" });

  try {
    const { userId, ...updateData } = req.body;

    if (!userId) {
      return res.json({ error: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    // Update all fields that are provided
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && updateData[key] !== "") {
        // Handle boolean fields properly
        if (
          typeof updateData[key] === "boolean" ||
          updateData[key] === "true" ||
          updateData[key] === "false"
        ) {
          user[key] = updateData[key] === true || updateData[key] === "true";
        }
        // Handle numeric fields
        else if (key === "age" || key === "height" || key === "siblings") {
          const num = parseInt(updateData[key]);
          if (!isNaN(num)) user[key] = num;
        }
        // Handle arrays
        else if (Array.isArray(updateData[key])) {
          user[key] = updateData[key];
        }
        // Handle regular fields
        else {
          user[key] = updateData[key];
        }
      }
    });

    await user.save();

    console.log(`User ${user.username} updated successfully by admin`);
    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.json({ error: `Failed to update user: ${error.message}` });
  }
});

// Add this new route for account info updates

// Add these routes in App.js after your existing routes

// Get sent requests
app.get("/api/requests/sent", isLoggedIn, async (req, res) => {
  try {
    const requests = await Request.find({ from: req.session.userId })
      .populate("to", "username city profilePicture age country state")
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
});

// Get received requests
app.get("/api/requests/received", isLoggedIn, async (req, res) => {
  try {
    const requests = await Request.find({ to: req.session.userId })
      .populate("from", "username profilePicture city age")
      .sort({ createdAt: -1 });
    console.log("received requests are: ", requests);
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching received requests:", error);
    res.status(500).json({ success: false, error: "Failed to fetch requests" });
  }
});

// Respond to request
// Replace your existing /api/requests/:requestId/respond route
app.post("/api/requests/:requestId/respond", isLoggedIn, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ success: false, error: "Invalid action" });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }

    // Check if user is the recipient
    if (request.to.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    request.status = action;
    await request.save();

    if (action === "accepted") {
      // Grant mutual access
      const requestFromUser = await User.findById(request.from);
      const requestToUser = await User.findById(request.to);

      if (!requestFromUser.canAccessFullProfileOf.includes(requestToUser._id)) {
        requestFromUser.canAccessFullProfileOf.push(requestToUser._id);
      }

      if (!requestToUser.canAccessFullProfileOf.includes(requestFromUser._id)) {
        requestToUser.canAccessFullProfileOf.push(requestFromUser._id);
      }

      await requestFromUser.save();
      await requestToUser.save();
    } else if (action === "rejected") {
      // Remove access
      const requestToUser = await User.findById(request.to);
      requestToUser.canAccessFullProfileOf.pull(request.from);
      await requestToUser.save();
    }

    res.json({ success: true, message: `Request ${action} successfully` });
  } catch (error) {
    console.error("Error responding to request:", error);
    res.status(500).json({ success: false, error: "Failed to update request" });
  }
});
// Add this temporary route to clean up invalid marital status values
// Alternative bulk update approach

app.get("/allusersmaritalstatus", async (req, res) => {
  try {
    const users = await User.find({}).select("username maritalStatus");
    const maritalStatusCounts = users.reduce((acc, user) => {
      const status = user.maritalStatus || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    res.json(maritalStatusCounts);
  } catch (error) {
    console.error("Error fetching marital status counts:", error);
    res.status(500).json({ error: "Failed to fetch marital status counts" });
  }
});

app.listen(port, (req, res) => {
  console.log("on port 3000!");
});
