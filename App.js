require("dotenv").config(); // MUST be first!
const { muslimMaleNames, muslimFemaleNames } = require("./config/seoData");
const Blog = require("./models/Blog");
function getRandomSeoName(gender) {
  if (gender === "male") {
    const randomIndex = Math.floor(Math.random() * muslimMaleNames.length);
    return muslimMaleNames[randomIndex];
  } else if (gender === "female") {
    const randomIndex = Math.floor(Math.random() * muslimFemaleNames.length);
    return muslimFemaleNames[randomIndex];
  }
  return null;
}
// **NEW**: Image optimization helper
function getOptimizedImageUrl(
  originalUrl,
  width = 300,
  height = 400,
  crop = "fill"
) {
  if (!originalUrl || !originalUrl.includes("cloudinary.com")) {
    return originalUrl;
  }

  // Insert transformations into Cloudinary URL
  return originalUrl.replace(
    "/upload/",
    `/upload/c_${crop},w_${width},h_${height},q_auto,f_auto/`
  );
}

// Make it available globally
global.getOptimizedImageUrl = getOptimizedImageUrl;
const slugify = require("slugify");
// **NEW**: Function to ensure unique slug
const {
  calculateProfileCompletion,
  generateProfileSlug,
  generateUniqueSlug,
} = require("./utils/profileHelpers");

function addProfileSlugHistory(profile, oldSlug, newSlug) {
  if (!oldSlug || oldSlug === newSlug) {
    return;
  }

  if (!profile.profileSlugHistory) {
    profile.profileSlugHistory = [];
  }

  if (!profile.profileSlugHistory.includes(oldSlug)) {
    profile.profileSlugHistory.push(oldSlug);
  }
}
const User = require("./models/user");
const Newsletter = require("./models/Newsletter");
const { countryOptions, countryPlaceholders } = require("./config/countries");
const path = require("path");
const Request = require("./models/Request");
const Notification = require("./models/Notification");
const NotificationService = require("./services/notificationService");
const QueueService = require("./services/queueService");
const isLoggedIn = require("./middlewares/isLoggedIn");
const findUser = require("./middlewares/findUser");
const requireApprovedProfile = require("./middlewares/requireApprovedProfile");
const {
  requireAdminOrModerator,
  requireAdminOnly,
  requireViewAccess,
} = require("./middlewares/accessControl");
const { requireSeoAdmin, requireSeoAdminApi } = require("./middlewares/seoAdminAuth");
const GlobalSeoSettings = require("./models/GlobalSeoSettings");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const MongoStore = require("connect-mongo");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const passport = require("./config/passport");
const port = process.env.PORT;
const compression = require("compression");
const app = express();
app.set("trust proxy", 1);
app.use(express.static(path.join(__dirname, "public")));
app.use(compression());
app.use((req, res, next) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // SEO-friendly cache headers for static assets
  if (
    req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
  }

  next();
});
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
});
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 email verification requests per hour
  message: {
    success: false,
    error: "Too many email verification attempts. Please try again in 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: "Too many password reset attempts. Please try again in 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
});

app.use(limiter);
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
app.use(passport.initialize());
app.use(passport.session());
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let username = req.userData?.username || req.body?.userId || "unknown";

    if (req.body?.userId && !req.userData?.username) {
      try {
        const user = await User.findById(req.body.userId);
        username = user?.username || "unknown";
      } catch (e) {
        console.log("Error finding user for username:", e);
      }
    }

    let suffix = "";
    if (file.fieldname === "coverPhoto") {
      suffix = "C";
    } else if (file.fieldname === "profilePic") {
      suffix = "P";
    } else {
      suffix = "imgs1";
    }

    return {
      folder: "user_profiles",
      public_id: `${username}${suffix}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      // **ENHANCED**: Better compression and optimization
      transformation: [
        { quality: "auto:good" }, // Smart compression
        { fetch_format: "auto" }, // Serve optimal format (WebP when supported)
        {
          if: "w_gt_1200",
          width: 1200,
          crop: "limit",
        }, // Limit max width
        {
          if: "h_gt_1200",
          height: 1200,
          crop: "limit",
        }, // Limit max height
      ],
    };
  },
});
const upload = multer({ storage });
const {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendProfileApprovalEmail,
} = require("./services/emailService");
const requireProfileComplete = require("./middlewares/requireProfileComplete");
const requireOnboardingComplete = require("./middlewares/requireOnboardingComplete");

// Add this middleware after your session setup but before your routes
app.set("view engine", "ejs");

mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log(" Mongoose Server Started!");
  })
  .catch((err) => {
    console.log(" Err mongoose!", err);
  });
app.use((req, res, next) => {
  // Make user data available to all templates
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.isAdmin || false; // **EXISTING**
  res.locals.isModerator = req.session.isModerator || false; // **NEW**
  next();
});
// Place after app.use(session(...)) and before your routes
app.use((req, res, next) => {
  res.locals.isProd = process.env.NODE_ENV === "production";
  res.locals.isAdmin = req.session.user?.isAdmin || false;
  res.locals.GA_ID = process.env.GA_MEASUREMENT_ID; // Use your existing ID from Google
  next();
});

// **NEW**: Global SEO Settings Middleware - Make available to all views
app.use(async (req, res, next) => {
  try {
    res.locals.globalSeoSettings = await GlobalSeoSettings.getSettings();
  } catch (error) {
    console.error("Error loading global SEO settings:", error);
    res.locals.globalSeoSettings = null;
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get(["/", "/home"], requireOnboardingComplete, (req, res) => {
  res.render("home", {
    user: req.session.user || null,
  });
});

app.get("/register", (req, res) => {
  if (req.session.userId) {
    // User is already logged in, redirect to home or dashboard
    return res.redirect("/home");
  }
  res.render("register-new", {
    error: req.query.error || null,
  });
});

app.get("/onboarding", isLoggedIn, findUser, (req, res) => {
  const user = req.userData;

  // Check if user has completed onboarding (has all required fields from 5 steps)
  // Step 1: profileFor, gender, username
  // Step 2: name, age, height, maritalStatus  
  // Step 3: city, country
  // Step 4: highestEducation, work
  // Step 5: lookingForASpouseThatIs, aboutMe, contact
  if (user.profileSlug && user.name && user.age && user.height && 
      user.maritalStatus && user.city && user.country && 
      user.highestEducation && user.work && 
      user.lookingForASpouseThatIs && user.aboutMe && user.contact) {
    return res.redirect(`/account/info`);
  }

  res.render("onboarding-new", { user });
});
// **NEW**: Save onboarding step
app.post("/api/onboarding/save", isLoggedIn, findUser, async (req, res) => {
  try {
    const user = req.userData;
    const { step, data } = req.body;

    console.log(`Onboarding step ${step} data:`, data);

    // Server-side validation for step 6 (phone number)
    if (Number(step) === 6) {
      const countryCode = data.countryCode;
      const contactRaw = String(data.contact || "");
      const digits = contactRaw.replace(/\D/g, "");

      const phoneRules = {
        "+44": { min: 10, max: 10 },
        "+92": { min: 10, max: 10 },
        "+880": { min: 10, max: 10 },
        "+91": { min: 10, max: 10 },
        "+1": { min: 10, max: 10 },
        "+971": { min: 9, max: 9 },
        "+966": { min: 9, max: 9 },
        "+61": { min: 9, max: 9 },
        "+49": { min: 10, max: 11 },
        "+33": { min: 9, max: 9 },
        "+60": { min: 9, max: 10 },
        "+65": { min: 8, max: 8 },
      };

      const rule = phoneRules[countryCode];
      if (!rule || digits.length < rule.min || digits.length > rule.max) {
        return res.json({
          success: false,
          error: "invalid_phone",
          message: "Please enter a valid phone number for your selected country.",
        });
      }
    }

    // Update user fields based on step
    Object.keys(data).forEach((key) => {
  if (data[key] !== undefined && data[key] !== "" && data[key] !== "N/A") {
    // Handle numeric fields
    if (key === 'age' || key === 'height') {
      user[key] = Number(data[key]) || data[key];
    } else if (key === 'contact') {
      // Strip all non-numeric characters and convert to Number
      const cleanedContact = String(data[key]).replace(/\D/g, '');
      user[key] = cleanedContact ? Number(cleanedContact) : null;
    } else {
      user[key] = data[key];
    }
  }
});

    // Generate profile slug when we have the name (step 2)
    if (step === 2 && user.name && !user.profileSlug) {
      user.profileSlug = await generateUniqueSlug(user);
    }

    await user.save();

    // Update session
    req.session.user = user;

    res.json({
      success: true,
      message: `Step ${step} completed successfully!`,
      isLastStep: Number(step) === 6,
    });
  } catch (error) {
    console.error("Onboarding save error:", error);
    res.json({
      success: false,
      error: `Failed to save step: ${error.message}`,
    });
  }
});

// **NEW**: Complete onboarding
// Update the complete onboarding route:

app.post("/api/onboarding/complete", isLoggedIn, findUser, async (req, res) => {
  try {
    const user = req.userData;

    // Ensure user has profile slug
    if (!user.profileSlug) {
      user.profileSlug = await generateUniqueSlug(user);
      await user.save();
    }

    // No server-side phone validation - handled on client side
    res.json({
      success: true,
      redirectUrl: `/account/info?from=onboarding`,
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    res.json({
      success: false,
      error: "Failed to complete onboarding",
    });
  }
});
app.get("/api/profile-completion", isLoggedIn, findUser, async (req, res) => {
  try {
    const user = req.userData;
    const completion = calculateProfileCompletion(user);

    res.json({
      success: true,
      completion,
    });
  } catch (error) {
    console.error("Profile completion error:", error);
    res.json({
      success: false,
      error: "Failed to calculate profile completion",
    });
  }
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
    // **NEW**: Validate minimum character requirements
    const minCharFields = {
      aboutMe: 5,
      islamIsImportantToMeInfo: 5,
      describeNature: 5,
      lookingForASpouseThatIs: 5,
    };

    for (const [field, minLength] of Object.entries(minCharFields)) {
      const value = formData[field];
      if (value && value.trim().length < minLength) {
        return res.json({
          error: `${field
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()} must be at least ${minLength} characters long`,
        });
      }
    }

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
    if (formData.contact) {
  // Strip all non-numeric characters and convert to Number
  const cleanedContact = String(formData.contact).replace(/\D/g, '');
  user.contact = cleanedContact ? Number(cleanedContact) : null;
}
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
    const fieldsAffectingSlug = [
      "name",
      "birthPlace",
      "city",
      "country",
      "nationality",
      "age",
    ];
    const shouldUpdateSlug = fieldsAffectingSlug.some(
      (field) => formData[field] !== undefined
    );

    if (shouldUpdateSlug) {
      const previousSlug = user.profileSlug;
      user.profileSlug = await generateUniqueSlug(user);
      addProfileSlugHistory(user, previousSlug, user.profileSlug);
      console.log("Updated profile slug:", user.profileSlug);
    }

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
// Update the existing /register POST route - NEW SIMPLIFIED FLOW
app.post("/register", async (req, res) => {
  console.log("Register request body:", req.body);

  const { email, password, confirmPassword, emailVerified } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.render("register-new", {
      error: "Email and password are required.",
    });
  }

  // Check email verification
  if (emailVerified !== 'true' || !req.session.emailVerified || req.session.verifiedEmail !== email.toLowerCase()) {
    return res.render("register-new", {
      error: "Please verify your email address first.",
    });
  }

  // Check password confirmation
  if (password !== confirmPassword) {
    return res.render("register-new", {
      error: "Passwords do not match.",
    });
  }

  // Check password length
  if (password.length < 5) {
    return res.render("register-new", {
      error: "Password must be at least 5 characters long.",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render("register-new", {
      error: "Please enter a valid email address.",
    });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render("register-new", {
        error: "An account with this email already exists. Please login instead.",
      });
    }

    // Generate a unique username
    const generateUsername = () => {
      const adjectives = ['happy', 'bright', 'noble', 'kind', 'wise', 'calm', 'pure', 'true'];
      const nouns = ['soul', 'heart', 'star', 'light', 'moon', 'rose', 'pearl', 'gem'];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 9999);
      return `${adj}${noun}${num}`;
    };

    let username = generateUsername();
    // Ensure username is unique
    while (await User.findOne({ username })) {
      username = generateUsername();
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      registrationSource: "register",
      isApproved: false,
      approvalStatus: "pending",
      isEmailVerified: true, // Email was verified during registration
    });

    // Generate profile slug
    newUser.profileSlug = await generateUniqueSlug(newUser);
    await newUser.save();

    console.log("User registration completed:", newUser.username);

    // Clean up verification session data
    delete req.session.emailVerified;
    delete req.session.verifiedEmail;

    // Set up session
    req.session.userId = newUser._id;
    req.session.user = newUser;

    // Save session before redirect to ensure data is persisted
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
      }
      return res.redirect("/onboarding");
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.render("register-new", {
      error: "Registration failed. Please try again.",
    });
  }
});

// Keep old passcode verification route for backward compatibility but mark as deprecated
// **DEPRECATED**: Passcode verification route
app.post("/api/verify-passcode", async (req, res) => {
  try {
    const { countryCode, mobileNumber, passcode } = req.body;

    if (!countryCode || !mobileNumber || !passcode) {
      return res.json({
        success: false,
        error: "All fields are required",
      });
    }

    // Clean the mobile number (remove any spaces, hyphens, etc.)
    const cleanMobile = mobileNumber.replace(/\D/g, "");

    if (cleanMobile.length < 7) {
      return res.json({
        success: false,
        error: "Please enter a valid mobile number",
      });
    }

    // Get the last 3 digits of the mobile number
    const lastThreeDigits = cleanMobile.slice(-3);

    // Base passcode is always "1111" (even length)
    const basePasscode = process.env.PASSCODE;

    // Generate expected passcode using the logic:
    // First digit at start, second digit in middle, third digit at end
    const firstDigit = lastThreeDigits[0];
    const secondDigit = lastThreeDigits[1];
    const thirdDigit = lastThreeDigits[2];

    // Insert: first digit at start, second in middle (position 2), third at end
    const expectedPasscode =
      firstDigit +
      basePasscode.substring(0, 2) +
      secondDigit +
      basePasscode.substring(2) +
      thirdDigit;

    console.log("Passcode verification:", {
      mobile: countryCode + cleanMobile,
      lastThreeDigits,
      expectedPasscode,
      providedPasscode: passcode,
    });

    let cleanPasscode = passcode;
    let employeePrefix = null;

    if (passcode.includes("-")) {
      const parts = passcode.split("-");
      if (parts.length === 2) {
        employeePrefix = parts[0];
        cleanPasscode = parts[1];
      }
    }

    console.log("Passcode verification with employee tracking:", {
      mobile: countryCode + cleanMobile,
      originalPasscode: passcode,
      employeePrefix,
      cleanPasscode,
      expectedPasscode,
    });

    if (cleanPasscode === expectedPasscode) {
      // Store verification in session
      req.session.passcodeVerified = true;
      req.session.verifiedMobile = countryCode + cleanMobile;
      req.session.verifiedPasscode = passcode; // **CHANGED**: Store original passcode with employee prefix
      req.session.employeePrefix = employeePrefix; // **NEW**: Store employee info for analytics

      res.json({
        success: true,
        message: "Mobile number and passcode verified successfully",
      });
    } else {
      res.json({
        success: false,
        error: "Your number and passcode do not match. please, try again",
      });
    }
  } catch (error) {
    console.error("Passcode verification error:", error);
    res.json({
      success: false,
      error: "Verification failed. Please try again.",
    });
  }
});
// **NEW**: Save gender and username route
app.post("/api/savegenderandusername", async (req, res) => {
  try {
    const { gender, username } = req.body;

    if (!gender || !username) {
      return res.json({
        success: false,
        error: "Gender and username are required",
      });
    }

    // Validate gender
    if (gender !== "male" && gender !== "female") {
      return res.json({
        success: false,
        error: "Please select a valid gender",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({
        success: false,
        error: "Username already exists. Please refresh to generate a new one.",
      });
    }

    // Check if passcode was verified
    if (!req.session.passcodeVerified || !req.session.verifiedMobile) {
      return res.json({
        success: false,
        error: "Please verify your passcode first",
      });
    }

    // Create temporary user record with basic info
    const hashedPassword = await bcrypt.hash(
      "temp_" + Math.random().toString(36).substring(2, 15),
      12
    );
    const randomNameForSeo = getRandomSeoName(gender);
    const newUser = new User({
      username,
      gender,
      password: hashedPassword, // Temporary password
      contact: req.session.verifiedMobile,
      passcodeUsed: req.session.verifiedPasscode,
      employeeRef: req.session.employeePrefix,
      registrationSource: "register",
      randomNameForSeo: randomNameForSeo
    });

    // Generate profile slug
    newUser.profileSlug = await generateUniqueSlug(newUser);
    await newUser.save();

    console.log("Gender and username saved for user:", username);

    // Store user ID in session for next steps
    req.session.tempUserId = newUser._id;

    res.json({
      success: true,
      message: "Information saved successfully",
    });
  } catch (error) {
    console.error("Save gender and username error:", error);
    res.json({
      success: false,
      error: "Failed to save information. Please try again.",
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
    req.session.isModerator = false; // **NEW**
    req.session.adminUsername = username;
    // Create a user object for admin with isAdmin flag
    req.session.user = {
      username: username,
      isAdmin: true,
      isModerator: false,
    };

    if (remember === "true" || remember === true) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie
    }

    return res.json({ success: true, redirect: "/admin/dashboard" });
  }
  // **NEW**: Check if it's moderator login
  if (
    username === process.env.MODERATOR_USERNAME &&
    password === process.env.MODERATOR_PASSWORD
  ) {
    req.session.isAdmin = false; // **NEW**
    req.session.isModerator = true; // **NEW**
    req.session.adminUsername = username;
    req.session.user = {
      username: username,
      isAdmin: false,
      isModerator: true, // **NEW**
    };

    if (remember === "true" || remember === true) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie
    }

    return res.json({ success: true, redirect: "/admin/dashboard" });
  }
  // If not admin,or moderator try user login
  const foundUser = await User.findOne({
    $or: [{ username: username }, { email: username.toLowerCase() }],
  });
  if (!foundUser) {
    return res.json({ error: "username or password is incorrect" });
  }

  const isMatch = await bcrypt.compare(password, foundUser.password);
  if (isMatch) {
    req.session.userId = foundUser._id;
    // Ensure user object has isAdmin flag
    const userObj = foundUser.toObject();
    userObj.isAdmin = false; // Regular users are not admin
    userObj.isModerator = false; // Regular users are not moderator
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
// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/register?error=no_account",
  }),
  (req, res) => {
    try {
      // Set session data
      req.session.userId = req.user._id;
      req.session.user = req.user;

      console.log("Google OAuth successful for user:", {
        id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        gender: req.user.gender,
        contact: req.user.contact,
      });

      // Clean up any temporary session data
      if (req.session.verifiedMobile) {
        console.log("Cleaned up verified mobile from session");
        delete req.session.passcodeVerified;
        delete req.session.verifiedMobile;
      }

      // **UPDATED**: Different redirect logic based on user profile completeness
      // Check if user needs onboarding (new user or incomplete profile)
      if (!req.user.age || !req.user.gender || !req.user.city) {
        return res.redirect("/onboarding");
      }

      // **NEW**: For existing users with complete basic info, redirect to home
      res.redirect("/home");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/login?error=oauth_error");
    }
  }
);
app.get("/auth/google/failure", (req, res) => {
  res.redirect("/login?error=oauth_error");
});
// Middleware to check and create notifications after login
app.use(async (req, res, next) => {
  // Only run for logged-in regular users (not admin)
  if (req.session.userId && !req.session.isAdmin) {
    try {
      // Check for email notification
      await NotificationService.checkAndCreateEmailNotification(
        req.session.userId
      );
    } catch (error) {
      console.error("Error in notification middleware:", error);
    }
  }
  next();
});

app.get("/logout", (req, res) => {
  const wasAdmin = req.session.isAdmin;
  const wasModerator = req.session.isModerator; // **NEW**

  req.session.destroy((err) => {
    if (err) {
      return res.send("error logging out");
    }
    res.clearCookie("connect.sid");

    // Redirect to appropriate page based on user type
    if (wasAdmin || wasModerator) {
      // **UPDATED**
      res.redirect("/login");
    } else {
      res.redirect("/home");
    }
  });
});

app.get(["/account", "/account/info"], isLoggedIn, findUser, requireOnboardingComplete, (req, res) => {
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

// Find the /requests/:id/accept route and update it

app.post("/requests/:id/accept", isLoggedIn, async (req, res) => {
  try {
    const requestId = req.params.id;
    const currentUserId = req.session.userId;

    // Find the request
    const request = await Request.findById(requestId).populate("from to");

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify the current user is the recipient of the request
    if (request.to._id.toString() !== currentUserId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to accept this request" });
    }

    // Check if request is still pending
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ error: "This request has already been processed" });
    }

    // Update request status
    request.status = "accepted";
    request.respondedAt = new Date();
    await request.save();

    // **RESTORED**: Give sender access to receiver's (acceptor's) full profile
    await User.findByIdAndUpdate(request.from._id, {
      $addToSet: { canAccessFullProfileOf: request.to._id },
    });

    // **NEW**: Queue background job for notifications and emails (non-blocking)
    // request.to is the acceptor (current user), request.from is the original requester
    QueueService.queueRequestAccepted(request.to, request.from);

    res.json({
      message: "Request accepted successfully",
      request: request,
    });
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ error: "Failed to accept request" });
  }
});
// Replace the existing /requests/:id/reject route
// Find the /requests/:id/reject route and update it

app.post("/requests/:id/reject", isLoggedIn, async (req, res) => {
  try {
    const requestId = req.params.id;
    const currentUserId = req.session.userId;

    // Find the request with populated users
    const request = await Request.findById(requestId).populate("from to");

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify the current user is the recipient of the request
    if (request.to._id.toString() !== currentUserId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to reject this request" });
    }

    // Check if request is still pending
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ error: "This request has already been processed" });
    }

    // Update request status
    request.status = "rejected";
    request.respondedAt = new Date();
    await request.save();

    // Remove request from both users' likeRequests arrays
    await User.findByIdAndUpdate(request.from._id, {
      $pull: { likeRequests: request._id },
    });

    await User.findByIdAndUpdate(request.to._id, {
      $pull: { likeRequests: request._id },
    });

    // **RESTORED**: Remove receiver's access to sender's full profile
    await User.findByIdAndUpdate(request.to._id, {
      $pull: { canAccessFullProfileOf: request.from._id },
    });

    // **NEW**: Queue background job for notifications and emails (non-blocking)
    // request.to is the rejector (current user), request.from is the original requester
    QueueService.queueRequestRejected(request.to, request.from);

    res.json({
      message: "Request rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

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
// Add after the /api/requests/:requestId/cancel route

// **NEW**: Revoke access to accepted request
app.post("/api/requests/:requestId/revoke", isLoggedIn, async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.session.userId;

    const request = await Request.findById(requestId).populate("from to");

    if (!request) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }

    // Verify the current user is either the sender or receiver
    const isFromUser = request.from._id.toString() === currentUserId;
    const isToUser = request.to._id.toString() === currentUserId;

    if (!isFromUser && !isToUser) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Only allow revoking accepted requests
    if (request.status !== "accepted") {
      return res.status(400).json({
        success: false,
        error: "Can only revoke accepted requests",
      });
    }

    const fromUserId = request.from._id;
    const toUserId = request.to._id;

    // Remove mutual access from both users
    await User.findByIdAndUpdate(fromUserId, {
      $pull: { canAccessFullProfileOf: toUserId },
    });

    await User.findByIdAndUpdate(toUserId, {
      $pull: { canAccessFullProfileOf: fromUserId },
    });

    // Update request status to revoked
    request.status = "revoked";
    request.respondedAt = new Date();
    await request.save();

    // Create notifications for both users
    const revokerUser = isFromUser ? request.from : request.to;
    const otherUser = isFromUser ? request.to : request.from;

    await NotificationService.createNotification({
      userId: otherUser._id,
      type: "request_revoked",
      title: "Connection Revoked",
      message: `${revokerUser.username} has revoked access to their profile.`,
      priority: "medium",
      actionUrl: "/profiles",
      actionText: "Browse Profiles",
    });

    res.json({
      success: true,
      message: "Access revoked successfully. You are now strangers.",
    });
  } catch (error) {
    console.error("Error revoking access:", error);
    res.status(500).json({
      success: false,
      error: "Failed to revoke access",
    });
  }
});
app.get("/profiles",requireOnboardingComplete, async (req, res) => {
  // Pagination params
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  // Extract filter parameters
  const { gender, minAge, maxAge, minHeight, maxHeight, city, country, nationality } =
    req.query;

  // Build filter object
  const filter = {};

  // **NEW**: Only show approved profiles to regular users
  // Admins and moderators can see all profiles
  if (!req.session.isAdmin && !req.session.isModerator) {
    filter.isApproved = true;
    filter.approvalStatus = "approved";
  }

  if (gender) filter.gender = gender;
  if (city) filter.city = { $regex: new RegExp(city, "i") };
  if (country) filter.country = { $regex: new RegExp(country, "i") };
  if (nationality) filter.nationality = nationality; // kept for backward compatibility

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

  try {
    // **NEW**: Get featured profiles (max 4, exclude current user)
    const featuredFilter = { isFeatured: true };

    const featuredProfiles = await User.find(featuredFilter)
      .limit(4)
      .sort({ featuredDate: -1 }); // Show most recently featured first

    // **UPDATED**: Exclude featured profiles from regular profiles to avoid duplicates
    // const excludeIds = [
    //   ...(req.session.userId ? [req.session.userId] : []),
    //   ...featuredProfiles.map((profile) => profile._id),
    // ];
    // filter._id = { $nin: excludeIds };
    const excludeIds = featuredProfiles.map((profile) => profile._id);
    if (excludeIds.length > 0) {
      filter._id = { $nin: excludeIds };
    }
    const totalProfiles = await User.countDocuments(filter);

    // **NEW**: Handle sorting
    const { sortBy } = req.query;
    let sortOptions = {};

    if (sortBy === "random") {
      // For random sorting, we'll use MongoDB's $sample aggregation
      const profiles = await User.aggregate([
        { $match: filter },
        { $sample: { size: Math.min(limit, totalProfiles) } },
      ]);
    } else {
      // Default: newly created (most recent first)
      sortOptions = { createdAt: -1, _id: -1 };
    }

    // **UPDATED**: Apply sorting based on sortBy parameter
    const profiles =
      sortBy === "random"
        ? await User.aggregate([
          { $match: filter },
          { $skip: skip },
          { $sample: { size: Math.min(limit, totalProfiles - skip) } },
        ])
        : await User.find(filter).sort(sortOptions).skip(skip).limit(limit);

    const activeFilters = {
      gender,
      minAge,
      maxAge,
      minHeight,
      maxHeight,
      city,
      country,
      nationality,
    };

    const totalPages = Math.ceil(totalProfiles / limit);

    // Get current user's profile if logged in
    let currentUserProfile = null;
    if (req.session.userId) {
      currentUserProfile = await User.findById(req.session.userId);
    }

    return res.render("profiles", {
      featuredProfiles, // **NEW**
      profiles,
      filters: Object.keys(req.query).length > 0 ? activeFilters : null,
      sortBy: sortBy || "newly-created", // **NEW**
      page,
      totalPages,
      totalProfiles,
      currentUserProfile, // **NEW**: Pass current user's profile for pending notice
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
app.get("/profiles/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    let foundProfile;
    let shouldRedirect = false;

    // Check if it's an old MongoDB ID format (for backward compatibility)
    if (mongoose.Types.ObjectId.isValid(slug) && slug.length === 24) {
      // Find by ID
      foundProfile = await User.findById(slug);
      shouldRedirect = true; // We found by ID, so we should redirect to slug
    } else {
      // It's a slug - find by slug field
      foundProfile = await User.findOne({ profileSlug: slug });
      if (!foundProfile) {
        foundProfile = await User.findOne({ profileSlugHistory: slug });
        shouldRedirect = Boolean(foundProfile);
      }
    }

    if (!foundProfile) {
      return res.status(404).render("404", {
        title: "Profile Not Found - D'amour Muslim",
        url: req.originalUrl,
      });
    }

    // **NEW**: Hide unapproved profiles from regular users
    // Only admins and moderators can view unapproved profiles
    // Also allow the user to see their own profile
    const isOwnProfile = req.session.userId && foundProfile._id.toString() === req.session.userId.toString();
    if (!foundProfile.isApproved && !req.session.isAdmin && !req.session.isModerator && !isOwnProfile) {
      return res.status(404).render("404", {
        title: "Profile Not Found - D'amour Muslim",
        url: req.originalUrl,
      });
    }

    // **NEW**: If we found the profile by ID, redirect to the slug URL
    if (
      shouldRedirect &&
      foundProfile.profileSlug &&
      slug !== foundProfile.profileSlug
    ) {
      return res.redirect(301, `/profiles/${foundProfile.profileSlug}`);
    }

    // **NEW**: If profile doesn't have a slug, generate one and redirect

    let canAccessFullProfile = false;
    let hasalreadysentrequest = false;
    let connectionStatus = null; // NEW: Track connection status
    let incomingRequest = null;  // NEW: Track if profile owner sent us a request
    let outgoingRequest = null;  // NEW: Track our sent request to this profile

    // If admin, always grant full access
    if (req.session.isAdmin || req.session.isModerator) {
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
      const existingOutgoingRequest = await Request.findOne({
        from: req.session.userId,
        to: foundProfile._id,
        status: { $in: ["pending", "accepted"] },
      });

      if (existingOutgoingRequest) {
        hasalreadysentrequest = existingOutgoingRequest.status === "pending";
        outgoingRequest = existingOutgoingRequest; // Store the full request object
        
        if (existingOutgoingRequest.status === "accepted") {
          connectionStatus = "connected";
        }
      }

      // NEW: Check if profile owner has sent a request TO the logged-in user
      const existingIncomingRequest = await Request.findOne({
        from: foundProfile._id,
        to: req.session.userId,
        status: "pending",
      });

      if (existingIncomingRequest) {
        incomingRequest = existingIncomingRequest;
      }

      // NEW: Also check for accepted incoming request (they sent, we accepted)
      if (!connectionStatus) {
        const acceptedIncomingRequest = await Request.findOne({
          from: foundProfile._id,
          to: req.session.userId,
          status: "accepted",
        });
        if (acceptedIncomingRequest) {
          connectionStatus = "connected";
          outgoingRequest = acceptedIncomingRequest; // Use this for revoke action
        }
      }
    }
    const { findSimilarProfiles } = require("./utils/profileHelpers");
    const currentUserId = req.session.userId || null;
    const similarProfiles = await findSimilarProfiles(foundProfile, 3, currentUserId);

    res.render("profile", {
      profile: foundProfile,
      canAccessFullProfile,
      hasalreadysentrequest,
      connectionStatus,     // NEW
      incomingRequest,      // NEW
      outgoingRequest,      // NEW
      user: req.session.user,
      isAdmin: req.session.isAdmin,
      filters: null,
      similarProfiles,
      isOwnProfile,         // **NEW**: Pass if viewing own profile
    });
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).render("error", {
      title: "Server Error",
      message: "Failed to load profile",
      error: process.env.NODE_ENV === "development" ? err : {},
    });
  }
});
// Find the /interested/:id route and update it

app.post(
  "/interested/:id",
  isLoggedIn,
  requireProfileComplete,
  requireApprovedProfile,
  async (req, res) => {
    try {
      const interestedInUserId = req.params.id;
      const currentUserId = req.session.userId;

      // Get both users
      const currentUser = await User.findById(currentUserId);
      const interestedInUser = await User.findById(interestedInUserId);

      if (!currentUser || !interestedInUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // **NEW**: Check if the target user is approved (can't send requests to unapproved profiles)
      if (!interestedInUser.isApproved) {
        return res.status(400).json({ 
          error: "cannot_send_to_unapproved",
          message: "This profile is pending approval and cannot receive requests yet." 
        });
      }

      // **NEW**: Check request limit (max 5 pending requests)
      const pendingSentRequests = await Request.countDocuments({
        from: currentUserId,
        status: "pending",
      });

      if (pendingSentRequests >= 5) {
        return res.status(400).json({
          error: "request_limit_reached",
          message:
            "You have reached the maximum of 5 pending requests. Please wait for responses or cancel existing requests.",
        });
      }

      // Check if request already exists
      const existingRequest = await Request.findOne({
  from: currentUserId,
  to: interestedInUserId,
  status: { $in: ["pending", "accepted"] } // Only block if pending or accepted
});

if (existingRequest) {
  if (existingRequest.status === "pending") {
    return res.status(400).json({ error: "You have already sent a pending request to this user" });
  } else if (existingRequest.status === "accepted") {
    return res.status(400).json({ error: "You already have an active connection with this user" });
  }
}

      // Check if reverse request exists (they already sent you a request)
      const reverseRequest = await Request.findOne({
        from: interestedInUserId,
        to: currentUserId,
        status: "pending",
      });

      if (reverseRequest) {
        return res.status(400).json({
          error: "This user has already sent you a request. Check your pending requests.",
        });
      }

      // Create the request
      const newRequest = new Request({
        from: currentUserId,
        to: interestedInUserId,
        status: "pending",
      });

      await newRequest.save();

      // Add request to both users' likeRequests arrays
      await User.findByIdAndUpdate(currentUserId, {
        $push: { likeRequests: newRequest._id },
      });

      await User.findByIdAndUpdate(interestedInUserId, {
        $push: { likeRequests: newRequest._id },
      });

      // **RESTORED**: Give receiver access to sender's full profile
      await User.findByIdAndUpdate(interestedInUserId, {
        $addToSet: { canAccessFullProfileOf: currentUserId },
      });

      // **NEW**: Queue background job for notifications and emails (non-blocking)
      QueueService.queueRequestSent(currentUser, interestedInUser);

      res.json({
        message: "Interest request sent successfully",
        requestId: newRequest._id,
      });
    } catch (error) {
      console.error("Error sending interest request:", error);
      res.status(500).json({ error: "Failed to send interest request" });
    }
  }
);

// ...existing code...
app.get("/admin", (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin/dashboard");
  }
  // Redirect to main login page instead of rendering separate admin login
  res.redirect("/login");
});
app.get("/admin/addUser", requireAdminOnly, (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");
  res.render("admin/addUser");
});
// Replace the existing /admin/dashboard route with this updated version

// ...existing code...
app.get("/admin/dashboard", requireAdminOrModerator, async (req, res) => {
  if (!req.session.isAdmin && !req.session.isModerator) {
    return res.redirect("/login");
  }

  try {
    // **UPDATED**: Handle filter parameter only (no pagination)
    const { filter } = req.query;

    // Build query based on filter
    let query = {};
    if (filter === "admin") {
      query.registrationSource = "admin";
    } else if (filter === "register") {
      query.registrationSource = "register";
    } else if (filter === "featured") {
      query.isFeatured = true;
    } else if (filter === "pending") {
      // **NEW**: Filter for pending approval profiles
      query.approvalStatus = "pending";
    } else if (filter === "approved") {
      // **NEW**: Filter for approved profiles
      query.approvalStatus = "approved";
    } else if (filter && filter.startsWith("employee-")) {
      const employeeName = filter.replace("employee-", "");
      query.passcodeUsed = { $regex: new RegExp(`^${employeeName}-`, "i") };
    }

    // Get ALL users (no pagination)
    const users = await User.find(query)
      .sort({ createdAt: -1, _id: -1 });

    // Calculate stats (always from all users, not filtered)
    const allTotalUsers = await User.countDocuments({});
    const byAdmin = await User.countDocuments({ registrationSource: "admin" });
    const bySelf = await User.countDocuments({ registrationSource: "register" });
    const featuredCount = await User.countDocuments({ isFeatured: true });
    // **NEW**: Pending and approved counts
    const pendingCount = await User.countDocuments({ approvalStatus: "pending" });
    const approvedCount = await User.countDocuments({ approvalStatus: "approved" });

    // Extract unique employee/referrer names
    const allUsers = await User.find({}, { passcodeUsed: 1 }).lean();
    const employeeNames = new Set();

    allUsers.forEach(user => {
      if (user.passcodeUsed && typeof user.passcodeUsed === 'string') {
        const passcode = user.passcodeUsed.trim();
        if (passcode.includes('-')) {
          const parts = passcode.split('-');
          if (parts.length >= 2) {
            const employeeName = parts[0].trim();
            const passcodeDigits = parts[1];
            if (employeeName && passcodeDigits && /^\d+$/.test(passcodeDigits)) {
              employeeNames.add(employeeName);
            }
          }
        }
      }
    });

    const uniqueEmployees = Array.from(employeeNames).sort();

    // Calculate employee stats
    const employeeStats = {};
    for (const employeeName of uniqueEmployees) {
      const count = await User.countDocuments({
        passcodeUsed: { $regex: new RegExp(`^${employeeName}-`, "i") }
      });
      employeeStats[employeeName] = count;
    }

    const stats = {
      totalUsers: allTotalUsers,
      registrationSources: {
        byAdmin,
        bySelf,
      },
      featuredCount,
      pendingCount,
      approvedCount,
      employeeStats,
    };

    res.render("admin/dashboard", {
      users,
      stats,
      currentFilter: filter || "all",
      uniqueEmployees,
      isAdmin: req.session.isAdmin || false,
      isModerator: req.session.isModerator || false
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.render("admin/dashboard", {
      users: [],
      stats: {
        totalUsers: 0,
        registrationSources: { byAdmin: 0, bySelf: 0 },
        featuredCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        employeeStats: {},
      },
      currentFilter: "all",
      uniqueEmployees: [],
      isAdmin: req.session.isAdmin || false,
      isModerator: req.session.isModerator || false
    });
  }
});
// ...existing code... (after the dashboard route)

// API endpoint for infinite scroll pagination

// ...existing code...
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

// **NEW**: Approve user profile route
app.post("/api/admin/user/:id/approve", requireAdminOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    user.isApproved = true;
    user.approvalStatus = "approved";
    user.approvedAt = new Date();
    user.approvedBy = req.session.adminUsername || "admin";
    
    await user.save();

    console.log(`User ${user.username} approved by ${user.approvedBy}`);

    // Send congratulations email if user has email
    if (user.email) {
      try {
        await sendProfileApprovalEmail(user.email, user.username, user.name);
        console.log(`Approval email sent to ${user.email}`);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the approval if email fails
      }
    }

    // Create notification for the user
    try {
      await NotificationService.createNotification({
        userId: user._id,
        type: "profile_approved",
        title: "🎉 Profile Approved!",
        message: "Congratulations! Your profile has been reviewed and approved by our team. You can now receive interest requests from other members.",
        priority: "high",
        actionUrl: "/account/info",
        actionText: "View Profile",
      });
      console.log(`Approval notification created for user ${user.username}`);
    } catch (notifError) {
      console.error("Failed to create approval notification:", notifError);
      // Don't fail the approval if notification fails
    }

    res.json({ 
      success: true, 
      message: `Profile for ${user.name || user.username} has been approved.` 
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({ success: false, error: "Failed to approve user" });
  }
});

// **NEW**: Reject user profile route
app.post("/api/admin/user/:id/reject", requireAdminOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    user.isApproved = false;
    user.approvalStatus = "rejected";
    user.rejectedAt = new Date();
    user.rejectionReason = reason || "Profile did not meet our guidelines";
    
    await user.save();

    console.log(`User ${user.username} rejected. Reason: ${user.rejectionReason}`);

    res.json({ 
      success: true, 
      message: `Profile for ${user.name || user.username} has been rejected.` 
    });
  } catch (error) {
    console.error("Reject user error:", error);
    res.status(500).json({ success: false, error: "Failed to reject user" });
  }
});
// **NEW**: Delete user account (with archive)
app.post("/api/admin/user/:id/delete", requireAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUsername = req.session.user?.username || "Admin";
    const DeletedAccount = require("./models/deletedAccount");

    const user = await User.findById(id);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    // Create archived copy of ALL user data before deletion
    const archivedAccount = new DeletedAccount({
      originalUserId: user._id,
      userData: user.toObject(), // Complete user data snapshot
      username: user.username,
      email: user.email,
      name: user.name,
      gender: user.gender,
      registeredAt: user.registeredAt,
      deletedBy: adminUsername,
      deletionReason: reason || "Account deleted by admin",
      canReactivate: false, // Account is permanently deleted
    });

    await archivedAccount.save();
    console.log(`User ${user.username} data archived successfully`);

    // Permanently delete the user (pre-delete middleware will clean up requests & notifications)
    await User.findByIdAndDelete(id);
    
    console.log(`User ${user.username} permanently deleted by ${adminUsername}`);

    res.json({
      success: true,
      message: "Account archived and permanently deleted",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.json({
      success: false,
      error: "Failed to delete account: " + error.message,
    });
  }
});

// **NEW**: Get deleted accounts list
app.get("/admin/deletedaccounts", requireAdminOnly, async (req, res) => {
  try {
    const DeletedAccount = require("./models/deletedAccount");
    
    const deletedAccounts = await DeletedAccount.find({})
      .sort({ deletedAt: -1 })
      .limit(100);

    const totalDeleted = await DeletedAccount.countDocuments({});
    const canReactivateCount = await DeletedAccount.countDocuments({ canReactivate: true });
    const reactivatedCount = await DeletedAccount.countDocuments({ reactivatedAt: { $ne: null } });

    res.render("admin/deletedaccounts", {
      deletedAccounts,
      totalDeleted,
      canReactivateCount,
      reactivatedCount,
      currentUser: req.session.user,
      isAdmin: req.session.user.role === "admin",
      isProd: process.env.NODE_ENV === "production",
      GA_ID: process.env.GA_ID,
    });
  } catch (error) {
    console.error("Error loading deleted accounts:", error);
    res.status(500).send("Error loading deleted accounts");
  }
});

// **NEW**: View specific deleted account details
app.get("/admin/deletedaccounts/:id", requireAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const DeletedAccount = require("./models/deletedAccount");
    
    const deletedAccount = await DeletedAccount.findById(id);
    
    if (!deletedAccount) {
      return res.status(404).send("Deleted account not found");
    }

    // Check if user still exists (deactivated) or completely deleted
    const currentUser = await User.findById(deletedAccount.originalUserId);

    res.render("admin/deletedAccountDetail", {
      deletedAccount,
      currentUser, // null if permanently deleted, exists if just deactivated
      isAdmin: req.session.user.role === "admin",
      adminUser: req.session.user,
      isProd: process.env.NODE_ENV === "production",
      GA_ID: process.env.GA_ID,
    });
  } catch (error) {
    console.error("Error loading deleted account details:", error);
    res.status(500).send("Error loading deleted account details");
  }
});

// **NEW**: Permanently delete archive record (user is already deleted)
app.post("/admin/deletedaccounts/:id/permanent-delete", requireAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const DeletedAccount = require("./models/deletedAccount");
    
    const deletedAccount = await DeletedAccount.findById(id);
    if (!deletedAccount) {
      return res.json({ success: false, error: "Archive record not found" });
    }

    // Delete the archive record
    await DeletedAccount.findByIdAndDelete(id);

    console.log(`Archive record permanently deleted: ${deletedAccount.username}`);

    res.json({
      success: true,
      message: "Archive record permanently deleted",
    });
  } catch (error) {
    console.error("Error permanently deleting archive record:", error);
    res.json({
      success: false,
      error: "Failed to permanently delete archive record",
    });
  }
});
app.post("/admin/user/add", requireAdminOnly, async (req, res) => {

  console.log("Received user data:", req.body); // Debug log

  const {
    username,
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
    adress,
    eyeColor,
    hairColor,
    complexion,
    build,
    wearHijab,
    beard,
    height,
    languagesSpoken,
    education,
    nationality,
    ethnicity,
    maritalStatus,
    disability,
    disabilityInfo,
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
  const minCharFields = {
    aboutMe: 5,
    islamIsImportantToMeInfo: 5,
    describeNature: 5,
    lookingForASpouseThatIs: 5,
  };

  for (const [field, minLength] of Object.entries(minCharFields)) {
    const value = req.body[field];
    if (value && value.trim().length < minLength) {
      return res.json({
        error: `${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} must be at least ${minLength} characters long`,
      });
    }
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

    // Process education and children arrays
    const educationArr = Array.isArray(education) ? education : [];
    const childrenArr = Array.isArray(children) ? children : [];
    const randomNameForSeo = getRandomSeoName(gender);
    // Create new user object with required fields
    const userData = {
      username,
      password: hashedPassword,
      gender,
      registrationSource: "admin",
      randomNameForSeo: randomNameForSeo
    };

    // Add optional STRING fields only if they exist and are not "N/A"
    if (name && name !== "N/A") userData.name = name;
    if (work && work !== "N/A") userData.work = work;
    if (country && country !== "N/A") userData.country = country;
    if (state && state !== "N/A") userData.state = state;
    if (city && city !== "N/A") userData.city = city;
    if (contact && contact !== "N/A") userData.contact = contact;
    if (religion && religion !== "N/A") userData.religion = religion;
    if (caste && caste !== "N/A") userData.caste = caste;
    if (adress && adress !== "N/A") userData.adress = adress;
    if (eyeColor && eyeColor !== "N/A") userData.eyeColor = eyeColor;
    if (hairColor && hairColor !== "N/A") userData.hairColor = hairColor;
    if (complexion && complexion !== "N/A") userData.complexion = complexion;
    if (build && build !== "N/A") userData.build = build;
    if (wearHijab && wearHijab !== "N/A") userData.wearHijab = wearHijab;
    if (beard && beard !== "N/A") userData.beard = beard;
    if (nationality && nationality !== "N/A")
      userData.nationality = nationality;
    if (ethnicity && ethnicity !== "N/A") userData.ethnicity = ethnicity;
    if (islamicSect && islamicSect !== "N/A")
      userData.islamicSect = islamicSect;
    if (islamIsImportantToMeInfo && islamIsImportantToMeInfo !== "N/A")
      userData.islamIsImportantToMeInfo = islamIsImportantToMeInfo;
    if (
      livingArrangementsAfterMarriage &&
      livingArrangementsAfterMarriage !== "N/A"
    )
      userData.livingArrangementsAfterMarriage =
        livingArrangementsAfterMarriage;
    if (futurePlans && futurePlans !== "N/A")
      userData.futurePlans = futurePlans;
    if (describeNature && describeNature !== "N/A")
      userData.describeNature = describeNature;
    if (fatherName && fatherName !== "N/A") userData.fatherName = fatherName;
    if (motherName && motherName !== "N/A") userData.motherName = motherName;
    if (fatherProfession && fatherProfession !== "N/A")
      userData.fatherProfession = fatherProfession;
    if (aboutMe && aboutMe !== "N/A") userData.aboutMe = aboutMe;
    if (preferredAgeRange && preferredAgeRange !== "N/A")
      userData.preferredAgeRange = preferredAgeRange;
    if (preferredHeightRange && preferredHeightRange !== "N/A")
      userData.preferredHeightRange = preferredHeightRange;
    if (preferredCaste && preferredCaste !== "N/A")
      userData.preferredCaste = preferredCaste;
    if (preferredEthnicity && preferredEthnicity !== "N/A")
      userData.preferredEthnicity = preferredEthnicity;
    if (lookingForASpouseThatIs && lookingForASpouseThatIs !== "N/A")
      userData.lookingForASpouseThatIs = lookingForASpouseThatIs;
    if (whoCompletedProfile && whoCompletedProfile !== "N/A")
      userData.whoCompletedProfile = whoCompletedProfile;
    if (waliMyContactDetails && waliMyContactDetails !== "N/A")
      userData.waliMyContactDetails = waliMyContactDetails;
    if (birthPlace && birthPlace !== "N/A") userData.birthPlace = birthPlace;
    if (
      anySpecialInformationPeopleShouldKnow &&
      anySpecialInformationPeopleShouldKnow !== "N/A"
    )
      userData.anySpecialInformationPeopleShouldKnow =
        anySpecialInformationPeopleShouldKnow;
    if (req.body.seoField1 && req.body.seoField1 !== "N/A") userData.seoField1 = req.body.seoField1;
    if (req.body.seoField2 && req.body.seoField2 !== "N/A") userData.seoField2 = req.body.seoField2;
    // Handle MARITAL STATUS (enum field)
    if (maritalStatus && maritalStatus !== "N/A") {
      userData.maritalStatus = maritalStatus;
    }

    // Handle DISABILITY (special logic)
    if (disability && disability !== "N/A") {
      if (disability === "yes" && disabilityInfo && disabilityInfo.trim()) {
        userData.disability = disabilityInfo.trim();
      } else if (disability === "no") {
        userData.disability = "no";
      } else if (disability !== "yes") {
        userData.disability = disability;
      }
    }

    // Handle NUMERIC fields (convert and validate)
    if (age && age !== "N/A" && age !== "") {
      const ageNum = parseInt(age);
      if (!isNaN(ageNum)) userData.age = ageNum;
    }
    if (height && height !== "N/A" && height !== "") {
      const heightNum = parseInt(height);
      if (!isNaN(heightNum)) userData.height = heightNum;
    }
    if (siblings !== undefined && siblings !== "N/A" && siblings !== "") {
      const siblingsNum = parseInt(siblings);
      if (!isNaN(siblingsNum)) userData.siblings = siblingsNum;
    }

    // Handle BOOLEAN fields - only save if not "N/A" and convert to proper boolean
    if (smoker !== undefined && smoker !== "N/A") {
      userData.smoker = smoker === "true";
    }
    if (bornMuslim !== undefined && bornMuslim !== "N/A") {
      userData.bornMuslim = bornMuslim === "true";
    }
    if (prays !== undefined && prays !== "N/A") {
      userData.prays = prays === "true";
    }
    if (celebratesMilaad !== undefined && celebratesMilaad !== "N/A") {
      userData.celebratesMilaad = celebratesMilaad === "true";
    }
    if (celebrateKhatams !== undefined && celebrateKhatams !== "N/A") {
      userData.celebrateKhatams = celebrateKhatams === "true";
    }
    if (willingToRelocate !== undefined && willingToRelocate !== "N/A") {
      userData.willingToRelocate = willingToRelocate;
    }
    if (allowParnterToWork !== undefined && allowParnterToWork !== "N/A") {
      userData.allowParnterToWork = allowParnterToWork === "true";
    }
    if (allowPartnerToStudy !== undefined && allowPartnerToStudy !== "N/A") {
      userData.allowPartnerToStudy = allowPartnerToStudy === "true";
    }
    if (
      acceptSomeoneWithChildren !== undefined &&
      acceptSomeoneWithChildren !== "N/A"
    ) {
      userData.acceptSomeoneWithChildren = acceptSomeoneWithChildren === "true";
    }
    if (
      acceptADivorcedPerson !== undefined &&
      acceptADivorcedPerson !== "N/A"
    ) {
      userData.acceptADivorcedPerson = acceptADivorcedPerson === "true";
    }
    if (agreesWithPolygamy !== undefined && agreesWithPolygamy !== "N/A") {
      userData.agreesWithPolygamy = agreesWithPolygamy === "true";
    }
    if (acceptAWidow !== undefined && acceptAWidow !== "N/A") {
      userData.acceptAWidow = acceptAWidow === "true";
    }
    if (
      AcceptSomeoneWithBeard !== undefined &&
      AcceptSomeoneWithBeard !== "N/A"
    ) {
      userData.AcceptSomeoneWithBeard = AcceptSomeoneWithBeard === "true";
    }
    if (
      AcceptSomeoneWithHijab !== undefined &&
      AcceptSomeoneWithHijab !== "N/A"
    ) {
      userData.AcceptSomeoneWithHijab = AcceptSomeoneWithHijab === "true";
    }
    if (ConsiderARevert !== undefined && ConsiderARevert !== "N/A") {
      userData.ConsiderARevert = ConsiderARevert === "true";
    }
    if (
      acceptSomeoneInOtherCountry !== undefined &&
      acceptSomeoneInOtherCountry !== "N/A"
    ) {
      userData.acceptSomeoneInOtherCountry = acceptSomeoneInOtherCountry;
    }
    if (
      willingToSharePhotosUponRequest !== undefined &&
      willingToSharePhotosUponRequest !== "N/A"
    ) {
      userData.willingToSharePhotosUponRequest =
        willingToSharePhotosUponRequest;
    }
    if (
      willingToMeetUpOutside !== undefined &&
      willingToMeetUpOutside !== "N/A"
    ) {
      userData.willingToMeetUpOutside = willingToMeetUpOutside;
    }
    if (
      willingToConsiderANonUkCitizen !== undefined &&
      willingToConsiderANonUkCitizen !== "N/A"
    ) {
      userData.willingToConsiderANonUkCitizen = willingToConsiderANonUkCitizen;
    }

    // Handle ARRAYS - only add if they have content
    if (languagesSpokenArr.length > 0) {
      userData.languagesSpoken = languagesSpokenArr;
    }
    if (qualitiesArr.length > 0) {
      userData.QualitiesThatYouCanBringToYourMarriage = qualitiesArr;
    }
    if (hobbiesArr.length > 0) {
      userData.hobbies = hobbiesArr;
    }
    if (qualitiesNeededArr.length > 0) {
      userData.qualitiesYouNeedInYourPartner = qualitiesNeededArr;
    }
    if (educationArr.length > 0) {
      userData.education = educationArr;
    }
    if (childrenArr.length > 0) {
      userData.children = childrenArr;
    }

    console.log("Creating user with data:", userData); // Debug log

    // Create and save user
    const user = new User(userData);
    user.profileSlug = await generateUniqueSlug(user);
    console.log("Generated slug:", user.profileSlug);
    await user.save();

    console.log("User created successfully:", user.username); // Debug log
    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("Add user error:", err);
    res.json({ error: `Failed to add user: ${err.message}` });
  }
});
app.get("/admin/user/:id", requireAdminOrModerator, async (req, res) => {
  if (!req.session.isAdmin && !req.session.isModerator) {
    return res.redirect("/login");
  }
  
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
    isAdmin: req.session.isAdmin || false,
    isModerator: req.session.isModerator || false,
  });
});
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

// Update User Route
const profileUpload = multer({ storage }).fields([
  { name: "profilePic", maxCount: 1 },
  { name: "coverPhoto", maxCount: 1 },
]);
app.post("/admin/user/update", profileUpload, async (req, res) => {
  try {
    let updateData, userId;

    if (req.files || req.body.userData) {
      // FormData request with files
      userId = req.body.userId;
      updateData = req.body.userData ? JSON.parse(req.body.userData) : {};
      console.log(
        "FormData request - userId:",
        userId,
        "files:",
        Object.keys(req.files || {})
      );
    } else {
      // JSON request without files
      const { userId: id, ...data } = req.body;
      userId = id;
      updateData = data;
      console.log("JSON request - userId:", userId);
    }

    if (!userId) {
      return res.json({ error: "User ID is required" });
    }

    // Authorization check
    const isAdmin = req.session.isAdmin;
    const isUserUpdatingSelf =
      req.session.userId && req.session.userId === userId;

    if (!isAdmin && !isUserUpdatingSelf) {
      console.log("Access denied:", {
        isAdmin,
        isUserUpdatingSelf,
        sessionUserId: req.session.userId,
        targetUserId: userId,
      });
      return res.status(403).json({
        error: "Forbidden: You can only update your own profile",
      });
    }

    // Set userData for Cloudinary storage naming
    if (isUserUpdatingSelf || isAdmin) {
      const currentUser = await User.findById(userId);
      req.userData = currentUser;
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    console.log("Update data received:", updateData);

    // **NEW**: Handle file uploads first
    if (req.files) {
      console.log("Files received:", Object.keys(req.files));

      // Handle profile picture
      if (req.files.profilePic && req.files.profilePic[0]) {
        const profilePicFile = req.files.profilePic[0];
        user.profilePic = {
          url: profilePicFile.path,
          filename: profilePicFile.filename,
        };
        console.log("Profile picture uploaded:", user.profilePic);
      }

      // Handle cover photo
      if (req.files.coverPhoto && req.files.coverPhoto[0]) {
        const coverPhotoFile = req.files.coverPhoto[0];
        user.coverPhoto = {
          url: coverPhotoFile.path,
          filename: coverPhotoFile.filename,
        };
        console.log("Cover photo uploaded:", user.coverPhoto);
      }
    }

    // Define field categories for cleaner processing
    const booleanFields = [
      "smoker",
      "bornMuslim",
      "prays",
      "celebratesMilaad",
      "celebrateKhatams",
      "allowParnterToWork",
      "allowPartnerToStudy",
      "acceptSomeoneWithChildren",
      "acceptADivorcedPerson",
      "agreesWithPolygamy",
      "acceptAWidow",
      "AcceptSomeoneWithBeard",
      "AcceptSomeoneWithHijab",
      "ConsiderARevert",
      // "acceptSomeoneInOtherCountry",
      // "willingToSharePhotosUponRequest",
      // "willingToMeetUpOutside",
      // "willingToConsiderANonUkCitizen",
    ];

    const numericFields = ["age", "height", "siblings", "contact"];

    const arrayFields = [
      "hobbies",
      "languagesSpoken",
      "QualitiesThatYouCanBringToYourMarriage",
      "qualitiesYouNeedInYourPartner",
    ];

    const objectArrayFields = ["education", "children"];

    const enumFields = {
      maritalStatus: [
        "married",
        "unmarried",
        "divorced",
        "widowed",
        "separated",
      ],
      build: ["slim", "average", "athletic", "heavy"],
      eyeColor: ["black", "brown", "grey", "other"],
      hairColor: ["black", "brown", "blonde"],
      complexion: ["fair", "wheatish", "dark"],
      ethnicity: ["bangladeshi", "pakistani", "indian", "british", "other"],
      gender: ["male", "female", "rather not say"],
    };

    // **IMPORTANT FIX**: Clear any existing "N/A" values in boolean fields |first
    booleanFields.forEach((field) => {
      if (user[field] === "N/A" || user[field] === null) {
        user[field] = undefined;
      }
    });

    // Process each field individually
    Object.keys(updateData).forEach((key) => {
      const value = updateData[key];

      // Handle N/A values - need special logic for different field types
      if (
        value === undefined ||
        value === "" ||
        value === "N/A" ||
        value === null
      ) {

        // **FIX**: Clear boolean fields when N/A
        if (booleanFields.includes(key) && value === "N/A") {
          user[key] = undefined;

        }

        // **NEW**: Clear enum fields when N/A
        else if (enumFields[key] && value === "N/A") {
          user[key] = undefined;
        }

        // Skip truly empty values (but N/A was handled above)
        if (value === undefined || value === "" || value === null) {
          return;
        }

        // If we reach here, it was "N/A" and was handled above
        return;
      }


      // Handle BOOLEAN fields
      if (booleanFields.includes(key)) {
        user[key] = value === "true" || value === true;
      }
      // Handle NUMERIC fields
      else if (numericFields.includes(key)) {
        const num = parseInt(value);
        if (!isNaN(num)) {
          user[key] = num;
        }
      }
      // Handle ARRAY fields (comma-separated strings)
      else if (arrayFields.includes(key)) {
        if (Array.isArray(value)) {
          user[key] = value.filter((item) => item && item.trim());
        } else if (typeof value === "string" && value.trim()) {
          user[key] = value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item);
        }
      }
      // Handle OBJECT ARRAY fields (education, children)
      else if (objectArrayFields.includes(key)) {
        if (Array.isArray(value)) {
          user[key] = value.filter(
            (item) =>
              item && Object.values(item).some((val) => val && val.trim())
          );
        }
      }
      // Handle ENUM fields with validation
      else if (enumFields[key]) {
        if (enumFields[key].includes(value)) {
          user[key] = value;
        } else {
        }
      }
      // Handle DISABILITY special case
      else if (key === "disability") {
        if (value === "no") {
          user[key] = "no";
        } else if (value && value.trim()) {
          user[key] = value.trim();
        }
      }
      // Handle all other STRING fields
      else {
        if (typeof value === "string" && value.trim()) {
          user[key] = value.trim();
        } else if (typeof value === "number") {
          user[key] = value;
        }
      }
    });

    // **FINAL CLEANUP**: Remove any remaining "N/A" or invalid values in boolean fields
    booleanFields.forEach((field) => {
      if (
        user[field] === "N/A" ||
        user[field] === null ||
        user[field] === "null"
      ) {
        user[field] = undefined;
      }
    });

    // Add debug log before saving
    const slugFields = [
      "name",
      "birthPlace",
      "city",
      "country",
      "nationality",
      "age",
    ];
    const shouldUpdateSlug = slugFields.some(
      (field) => updateData[field] !== undefined
    );

    if (shouldUpdateSlug) {
      const previousSlug = user.profileSlug;
      user.profileSlug = await generateUniqueSlug(user);
      addProfileSlugHistory(user, previousSlug, user.profileSlug);
      console.log("Admin updated profile slug:", user.profileSlug);
    }
    await user.save();

    console.log(`User ${user.username} updated successfully by admin`);
    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.json({ error: `Failed to update user: ${error.message}` });
  }
});

// Reset User Password Route
app.post("/admin/user/reset-password", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res
      .status(403)
      .json({ success: false, error: "Forbidden: Admin access required" });
  }

  try {
    const { userId, newPassword } = req.body;
    console.log("Reset password request for userId:", userId);

    // Validate input
    if (!userId || !newPassword) {
      return res.json({
        success: false,
        error: "User ID and new password are required",
      });
    }

    if (newPassword.length < 5) {
      return res.json({
        success: false,
        error: "Password must be at least 5 characters long",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }
    console.log("user password was", user.password);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    user.password = hashedPassword;
    await user.save();
    console.log("user new password is", user.password);
    console.log(`Admin reset password for user: ${user.username}`);

    res.json({
      success: true,
      message: `Password updated successfully for ${user.username}`,
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    res.json({
      success: false,
      error: `Failed to reset password: ${error.message}`,
    });
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


app.post("/api/requests/:requestId/respond", isLoggedIn, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const currentUserId = req.session.userId;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const request = await Request.findById(requestId).populate("from to");

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify the current user is the recipient
    if (request.to._id.toString() !== currentUserId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already processed" });
    }

    if (action === "accept") {
      request.status = "accepted";
      request.respondedAt = new Date();
      await request.save();

      // **RESTORED**: Give sender access to receiver's (acceptor's) full profile
      await User.findByIdAndUpdate(request.from._id, {
        $addToSet: { canAccessFullProfileOf: request.to._id },
      });

      // **NEW**: Queue notification
      QueueService.queueRequestAccepted(request.to, request.from);

      return res.json({ success: true, message: "Request accepted" });
    } else {
      request.status = "rejected";
      request.respondedAt = new Date();
      await request.save();

      // Remove from like requests
      await User.findByIdAndUpdate(request.from._id, {
        $pull: { likeRequests: request._id },
      });

      await User.findByIdAndUpdate(request.to._id, {
        $pull: { likeRequests: request._id },
      });

      // **RESTORED**: Remove receiver's access to sender's full profile
      await User.findByIdAndUpdate(request.to._id, {
        $pull: { canAccessFullProfileOf: request.from._id },
      });

      // **NEW**: Queue notification
      QueueService.queueRequestRejected(request.to, request.from);

      return res.json({ success: true, message: "Request rejected" });
    }
  } catch (error) {
    console.error("Error responding to request:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});
// Admin Requests Management Route
app.get("/admin/requests", requireAdminOrModerator, async (req, res) => {
  try {
    const { status } = req.query;

    // Build filter object
    const filter = {};
    if (status && ["pending", "accepted", "rejected"].includes(status)) {
      filter.status = status;
    }

    // Get all requests with populated user data
    const requests = await Request.find(filter)
      .populate(
        "from",
        "username name gender age city country createdAt profileSlug"
      )
      .populate(
        "to",
        "username name gender age city country createdAt profileSlug"
      )
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalRequests = await Request.countDocuments({});
    const pendingRequests = await Request.countDocuments({ status: "pending" });
    const acceptedRequests = await Request.countDocuments({
      status: "accepted",
    });
    const rejectedRequests = await Request.countDocuments({
      status: "rejected",
    });

    const stats = {
      total: totalRequests,
      pending: pendingRequests,
      accepted: acceptedRequests,
      rejected: rejectedRequests,
    };

    res.render("admin/requests", {
      requests,
      stats,
      currentFilter: status || "all",
    });
  } catch (error) {
    console.error("Admin requests error:", error);
    res.render("admin/requests", {
      requests: [],
      stats: { total: 0, pending: 0, accepted: 0, rejected: 0 },
      currentFilter: "all",
    });
  }
});
app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    const { name, email, interestedIn, preferredAgeRange } = req.body;

    // Validate required fields
    if (!name || !email || !interestedIn) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and preference are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({
      email: email.toLowerCase(),
    });
    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(400).json({
          success: false,
          error: "This email is already subscribed to our newsletter",
        });
      } else {
        // Reactivate existing subscriber
        existingSubscriber.isActive = true;
        existingSubscriber.name = name;
        existingSubscriber.interestedIn = interestedIn;
        existingSubscriber.preferredAgeRange = preferredAgeRange || null;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;

        await existingSubscriber.save();

        return res.json({
          success: true,
          message: "Welcome back! Your subscription has been reactivated.",
        });
      }
    }

    // Create new newsletter subscription
    const newSubscriber = new Newsletter({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      interestedIn,
      preferredAgeRange: preferredAgeRange || null,
      source: "website",
    });

    await newSubscriber.save();

    console.log("New newsletter subscriber:", newSubscriber.email);

    res.json({
      success: true,
      message: "Successfully subscribed to newsletter!",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);

    if (error.code === 11000) {
      // Duplicate email error
      return res.status(400).json({
        success: false,
        error: "This email is already subscribed",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to subscribe. Please try again later.",
    });
  }
});

// Admin route to view newsletter subscribers
// Admin route to view newsletter subscribers
app.get("/admin/newsletter", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/admin");
  }

  try {
    const { filter } = req.query;

    // Build query based on filter
    let query = { isActive: true };
    if (filter === "male") {
      query.interestedIn = "male";
    } else if (filter === "female") {
      query.interestedIn = "female";
    } else if (filter === "both") {
      query.interestedIn = "both";
    }

    const subscribers = await Newsletter.find(query).sort({
      subscribedAt: -1,
    });

    // Calculate all stats (not just filtered)
    const allSubscribers = await Newsletter.find({ isActive: true });
    const stats = {
      total: allSubscribers.length,
      male: allSubscribers.filter((s) => s.interestedIn === "male").length,
      female: allSubscribers.filter((s) => s.interestedIn === "female").length,
      both: allSubscribers.filter((s) => s.interestedIn === "both").length,
    };

    res.render("admin/newsletter", {
      subscribers,
      stats,
      currentFilter: filter || "all",
    });
  } catch (error) {
    console.error("Newsletter admin error:", error);
    res.render("admin/newsletter", {
      subscribers: [],
      stats: { total: 0, male: 0, female: 0, both: 0 },
      currentFilter: "all",
    });
  }
});
// **NEW**: Unsubscribe a user (admin action)
app.post(
  "/admin/newsletter/:id/unsubscribe",
  requireAdminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;

      const subscriber = await Newsletter.findById(id);
      if (!subscriber) {
        return res.json({ success: false, error: "Subscriber not found" });
      }

      subscriber.isActive = false;
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();

      console.log(`Admin unsubscribed user: ${subscriber.email}`);

      res.json({
        success: true,
        message: "User unsubscribed successfully",
      });
    } catch (error) {
      console.error("Admin unsubscribe error:", error);
      res.json({
        success: false,
        error: "Failed to unsubscribe user",
      });
    }
  }
);

// **NEW**: Export newsletter subscribers as CSV
app.get("/admin/newsletter/export", requireAdminOnly, async (req, res) => {
  try {
    const subscribers = await Newsletter.find({ isActive: true }).sort({
      subscribedAt: -1,
    });

    // Generate CSV content
    let csv =
      "Name,Email,Interested In,Preferred Age Range,Subscribed Date,Source\n";

    subscribers.forEach((subscriber) => {
      const subscribedDate = new Date(
        subscriber.subscribedAt
      ).toLocaleDateString();
      const ageRange = subscriber.preferredAgeRange || "Not specified";

      csv += `"${subscriber.name}","${subscriber.email}","${subscriber.interestedIn}","${ageRange}","${subscribedDate}","${subscriber.source}"\n`;
    });

    // Set headers for file download
    const filename = `newsletter_subscribers_${new Date().toISOString().split("T")[0]
      }.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    console.log(`Admin exported ${subscribers.length} newsletter subscribers`);

    res.send(csv);
  } catch (error) {
    console.error("Newsletter export error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export subscribers",
    });
  }
});

// **NEW**: Get newsletter stats API
app.get("/api/admin/newsletter/stats", requireAdminOnly, async (req, res) => {
  try {
    const totalActive = await Newsletter.countDocuments({ isActive: true });
    const totalInactive = await Newsletter.countDocuments({ isActive: false });
    const maleInterested = await Newsletter.countDocuments({
      isActive: true,
      interestedIn: "male",
    });
    const femaleInterested = await Newsletter.countDocuments({
      isActive: true,
      interestedIn: "female",
    });
    const bothInterested = await Newsletter.countDocuments({
      isActive: true,
      interestedIn: "both",
    });

    // Age range stats
    const ageRangeStats = {};
    const ageRanges = ["18-25", "26-30", "31-35", "36-40", "41+"];

    for (const range of ageRanges) {
      ageRangeStats[range] = await Newsletter.countDocuments({
        isActive: true,
        preferredAgeRange: range,
      });
    }

    res.json({
      success: true,
      stats: {
        total: totalActive,
        inactive: totalInactive,
        male: maleInterested,
        female: femaleInterested,
        both: bothInterested,
        ageRanges: ageRangeStats,
      },
    });
  } catch (error) {
    console.error("Newsletter stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch stats",
    });
  }
});
// Admin Request Actions (Enhanced with Delete)
app.post(
  "/admin/requests/:requestId/respond",
  requireAdminOrModerator,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { action } = req.body;

      if (!["accepted", "rejected", "revoke", "delete"].includes(action)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid action" });
      }

      const request = await Request.findById(requestId).populate(
        "from to",
        "username name profileSlug"
      );
      if (!request) {
        return res
          .status(404)
          .json({ success: false, error: "Request not found" });
      }

      // **NEW**: Handle delete action
      if (action === "delete") {
        // Remove mutual access between users if it exists
        const requestFromUser = await User.findById(request.from._id);
        const requestToUser = await User.findById(request.to._id);

        if (requestFromUser) {
          requestFromUser.canAccessFullProfileOf.pull(request.to._id);
          await requestFromUser.save();
        }

        if (requestToUser) {
          requestToUser.canAccessFullProfileOf.pull(request.from._id);
          requestToUser.likeRequests.pull(requestId);
          await requestToUser.save();
        }

        // Send notification to requester
        await NotificationService.createNotification({
          userId: request.from._id,
          type: "request_rejected", // Reuse rejected type or create new one
          title: "Request Deleted",
          message: `Your request to ${request.to.name || request.to.username
            } was deleted by admin.`,
          priority: "medium",
          actionUrl: "/profiles",
          actionText: "Browse Profiles",
        });

        // Delete the request permanently
        await Request.findByIdAndDelete(requestId);

        console.log(
          `Admin deleted request from ${request.from.username} to ${request.to.username}`
        );
        return res.json({
          success: true,
          message: "Request deleted successfully",
        });
      }

      // Handle revoke action
      if (action === "revoke") {
        if (request.status !== "accepted") {
          return res.status(400).json({
            success: false,
            error: "Can only revoke accepted requests",
          });
        }

        // Remove mutual access
        const requestFromUser = await User.findById(request.from._id);
        const requestToUser = await User.findById(request.to._id);

        if (requestFromUser) {
          requestFromUser.canAccessFullProfileOf.pull(request.to._id);
          await requestFromUser.save();
        }

        if (requestToUser) {
          requestToUser.canAccessFullProfileOf.pull(request.from._id);
          await requestToUser.save();
        }

        // Update request status back to pending
        request.status = "pending";
        await request.save();

        // Send notification to both users
        await NotificationService.createNotification({
          userId: request.from._id,
          type: "request_revoked",
          title: "Request Access Revoked",
          message: `Your accepted request with ${request.to.name || request.to.username
            } has been revoked by admin.`,
          priority: "high",
          actionUrl: "/profiles",
          actionText: "Browse Profiles",
        });

        await NotificationService.createNotification({
          userId: request.to._id,
          type: "request_revoked",
          title: "Request Access Revoked",
          message: `Your connection with ${request.from.name || request.from.username
            } has been revoked by admin.`,
          priority: "high",
          actionUrl: "/profiles",
          actionText: "Browse Profiles",
        });

        console.log(
          `Admin revoked request from ${request.from.username} to ${request.to.username}`
        );
        return res.json({
          success: true,
          message: "Request access revoked successfully",
        });
      }

      // Handle accept/reject actions
      request.status = action;
      await request.save();

      if (action === "accepted") {
        // Grant mutual access
        const requestFromUser = await User.findById(request.from._id);
        const requestToUser = await User.findById(request.to._id);

        if (
          !requestFromUser.canAccessFullProfileOf.includes(requestToUser._id)
        ) {
          requestFromUser.canAccessFullProfileOf.push(requestToUser._id);
        }

        if (
          !requestToUser.canAccessFullProfileOf.includes(requestFromUser._id)
        ) {
          requestToUser.canAccessFullProfileOf.push(requestFromUser._id);
        }

        await requestFromUser.save();
        await requestToUser.save();

        // Send notification to requester
        await NotificationService.createNotification({
          userId: request.from._id,
          type: "request_accepted",
          title: "Request Accepted!",
          message: `Congratulations! Your request was accepted by ${request.to.name || request.to.username
            }.`,
          priority: "high",
          actionUrl: `/profiles/${request.to.profileSlug || request.to._id}`,
          actionText: "View Profile",
        });
      } else if (action === "rejected") {
        // Remove any existing access
        const requestToUser = await User.findById(request.to._id);
        const requestFromUser = await User.findById(request.from._id);

        if (requestToUser) {
          requestToUser.canAccessFullProfileOf.pull(request.from._id);
          await requestToUser.save();
        }

        if (requestFromUser) {
          requestFromUser.canAccessFullProfileOf.pull(request.to._id);
          await requestFromUser.save();
        }

        // Send notification to requester
        await NotificationService.createNotification({
          userId: request.from._id,
          type: "request_rejected",
          title: "Request Declined",
          message: `Your request was declined by ${request.to.name || request.to.username
            }.`,
          priority: "medium",
          actionUrl: "/profiles",
          actionText: "Browse Profiles",
        });
      }

      console.log(
        `Admin ${action} request from ${request.from.username} to ${request.to.username}`
      );
      res.json({ success: true, message: `Request ${action} successfully` });
    } catch (error) {
      console.error("Admin request respond error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update request" });
    }
  }
);
// **NEW**: Feature/Unfeature Profile Route
app.post(
  "/admin/user/:id/feature",
  requireAdminOrModerator,
  async (req, res) => {
    if (!req.session.isAdmin && !req.session.isModerator) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    try {
      const { id } = req.params;
      const { action } = req.body;

      if (!action || !["feature", "unfeature"].includes(action)) {
        return res.json({ success: false, error: "Invalid action" });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.json({ success: false, error: "User not found" });
      }

      if (action === "feature") {
        user.isFeatured = true;
        user.featuredDate = new Date();
        console.log(`Admin featured profile: ${user.username}`);
      } else {
        user.isFeatured = false;
        user.featuredDate = null;
        console.log(`Admin unfeatured profile: ${user.username}`);
      }

      await user.save();

      res.json({
        success: true,
        message: `Profile ${action}d successfully`,
        isFeatured: user.isFeatured,
      });
    } catch (error) {
      console.error("Feature profile error:", error);
      res.json({
        success: false,
        error: `Failed to ${req.body.action} profile`,
      });
    }
  }
);
// **NEW**: Blog Management Routes

// Blog listing page (admin)
app.get("/admin/blogs", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/login");
  }

  try {
    const { filter } = req.query;

    // Build query based on filter
    let query = {};
    if (filter === "published") {
      query.isPublished = true;
    } else if (filter === "draft") {
      query.isPublished = false;
    }
    // For 'all' or no filter, query remains empty (gets all blogs)

    const blogs = await Blog.find(query).sort({ createdAt: -1 });

    // Calculate stats
    const totalBlogs = await Blog.countDocuments({});
    const publishedBlogs = await Blog.countDocuments({ isPublished: true });
    const draftBlogs = await Blog.countDocuments({ isPublished: false });

    const stats = {
      total: totalBlogs,
      published: publishedBlogs,
      drafts: draftBlogs,
    };

    res.render("admin/blogs", {
      blogs,
      stats,
      currentFilter: filter || "all",
    });
  } catch (error) {
    console.error("Blog listing error:", error);
    res.render("admin/blogs", {
      blogs: [],
      stats: { total: 0, published: 0, drafts: 0 },
      currentFilter: "all",
    });
  }
});

// Create blog page
app.get("/admin/blogs/create", requireAdminOnly, (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/login");
  }
  res.render("admin/createBlog");
});

// Create blog API
app.post("/admin/blogs", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  try {
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      metaTitle,
      metaDescription,
      keywords,
      isPublished,
      featuredImageUrl,
      featuredImageAlt,
      featuredImageCaption,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.json({
        success: false,
        error: "Title and content are required",
      });
    }

    // Process arrays from comma-separated strings
    const tagsArray = tags
      ? tags.split(",").map((tag) => tag.trim()).filter((tag) => tag)
      : [];
    const keywordsArray = keywords
      ? keywords.split(",").map((kw) => kw.trim()).filter((kw) => kw)
      : [];
    const featuredImage = featuredImageUrl ? {
      url: featuredImageUrl,
      alt: featuredImageAlt || '',
      caption: featuredImageCaption || ''
    } : undefined;
    // Create blog
    const blog = new Blog({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt ? excerpt.trim() : "",
      category: category || "Matrimony Tips",
      tags: tagsArray,
      metaTitle: metaTitle ? metaTitle.trim() : "",
      metaDescription: metaDescription ? metaDescription.trim() : "",
      keywords: keywordsArray,
      isPublished: Boolean(isPublished),
      publishedAt: Boolean(isPublished) ? new Date() : null,
      featuredImage,
      author: {
        name: "D'amour Muslim Team",
        profileUrl: "",
      },
    });

    await blog.save();

    console.log(`Blog created: ${blog.title} (${blog.isPublished ? 'Published' : 'Draft'})`);

    res.json({
      success: true,
      message: `Blog ${blog.isPublished ? 'published' : 'saved as draft'} successfully`,
      blog: blog,
    });
  } catch (error) {
    console.error("Create blog error:", error);
    res.json({
      success: false,
      error: `Failed to create blog: ${error.message}`,
    });
  }
});

// Edit blog page
app.get("/admin/blogs/:id/edit", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect("/login");
  }

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).render("404", {
        title: "Blog Not Found",
        url: req.originalUrl,
      });
    }

    res.render("admin/editBlog", { blog });
  } catch (error) {
    console.error("Edit blog page error:", error);
    res.redirect("/admin/blogs");
  }
});

// Update blog API
app.put("/admin/blogs/:id", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  try {
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      metaTitle,
      metaDescription,
      keywords,
      isPublished,
      featuredImageUrl,
      featuredImageAlt,
      featuredImageCaption,
    } = req.body;

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.json({ success: false, error: "Blog not found" });
    }

    // Process arrays from comma-separated strings
    const tagsArray = tags
      ? tags.split(",").map((tag) => tag.trim()).filter((tag) => tag)
      : [];
    const keywordsArray = keywords
      ? keywords.split(",").map((kw) => kw.trim()).filter((kw) => kw)
      : [];
    if (featuredImageUrl) {
      blog.featuredImage = {
        url: featuredImageUrl,
        alt: featuredImageAlt || '',
        caption: featuredImageCaption || ''
      };
    } else if (featuredImageUrl === null) {
      // Explicitly remove featured image if set to null
      blog.featuredImage = undefined;
    }
    // Update blog fields
    blog.title = title.trim();
    blog.content = content.trim();
    blog.excerpt = excerpt ? excerpt.trim() : "";
    blog.category = category || "Matrimony Tips";
    blog.tags = tagsArray;
    blog.metaTitle = metaTitle ? metaTitle.trim() : "";
    blog.metaDescription = metaDescription ? metaDescription.trim() : "";
    blog.keywords = keywordsArray;

    // Handle publication status
    const wasPublished = blog.isPublished;
    blog.isPublished = Boolean(isPublished);

    if (!wasPublished && blog.isPublished) {
      // Publishing for first time
      blog.publishedAt = new Date();
    } else if (wasPublished && !blog.isPublished) {
      // Unpublishing
      blog.publishedAt = null;
    }

    blog.updatedAt = new Date();

    await blog.save();

    console.log(`Blog updated: ${blog.title} (${blog.isPublished ? 'Published' : 'Draft'})`);

    res.json({
      success: true,
      message: `Blog ${blog.isPublished ? 'updated and published' : 'updated as draft'} successfully`,
    });
  } catch (error) {
    console.error("Update blog error:", error);
    res.json({
      success: false,
      error: `Failed to update blog: ${error.message}`,
    });
  }
});

// Delete blog API
app.delete("/admin/blogs/:id", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.json({ success: false, error: "Blog not found" });
    }

    await Blog.findByIdAndDelete(req.params.id);

    console.log(`Blog deleted: ${blog.title}`);

    res.json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.json({
      success: false,
      error: "Failed to delete blog",
    });
  }
});

// Toggle blog publication status
app.post("/admin/blogs/:id/toggle-publish", requireAdminOnly, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.json({ success: false, error: "Blog not found" });
    }

    // Toggle publication status
    blog.isPublished = !blog.isPublished;
    blog.publishedAt = blog.isPublished ? new Date() : null;
    blog.updatedAt = new Date();

    await blog.save();

    console.log(`Blog ${blog.isPublished ? 'published' : 'unpublished'}: ${blog.title}`);

    res.json({
      success: true,
      message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully`,
      isPublished: blog.isPublished,
    });
  } catch (error) {
    console.error("Toggle publish error:", error);
    res.json({
      success: false,
      error: "Failed to toggle publication status",
    });
  }
});
// Add this route after your existing routes (around line 4500)

// **NEW**: Blog image upload route
app.post("/api/upload-blog-image", requireAdminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: "No image uploaded" });
    }

    // Image is automatically uploaded to Cloudinary via multer-storage-cloudinary
    const imageUrl = req.file.path;

    console.log('Blog image uploaded:', imageUrl);

    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    res.json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});
// Unsubscribe route (for email links)
app.get("/newsletter/unsubscribe/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    if (subscriber) {
      subscriber.isActive = false;
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();
    }

    res.render("newsletter/unsubscribe", { email });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    res.status(500).send("Error unsubscribing");
  }
});
// Send email verification code
app.post(
  "/api/send-verification-code",
  emailVerificationLimiter,
  async (req, res) => {
    try {
      const { email, username } = req.body;

      if (!email) {
        return res.json({
          success: false,
          error: "Email is required",
        });
      }

      // Check if email already exists and is verified
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.json({
          success: false,
          error: "This email is already registered. Please login instead.",
        });
      }

      // Generate verification code
      const code = generateVerificationCode();

      // Send email (username is optional for registration flow)
      const displayName = username || email.split('@')[0];
      const emailResult = await sendVerificationEmail(email, code, displayName);

      if (!emailResult.success) {
        return res.json({
          success: false,
          error: "Failed to send verification email",
        });
      }

      // Store code in session temporarily (you could also store in database)
      req.session.pendingVerification = {
        email: email.toLowerCase(),
        code: code,
        username: username || null,
        expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      };

      res.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      console.error("Send verification code error:", error);
      res.json({ success: false, error: "Failed to send verification code" });
    }
  }
);

// Verify email code
app.post("/api/verify-email-code", async (req, res) => {
  try {
    const { code, email } = req.body;

    if (!req.session.pendingVerification) {
      return res.json({
        success: false,
        error: "No pending verification found. Please request a new code.",
      });
    }

    const pending = req.session.pendingVerification;

    // Verify email matches
    if (email && email.toLowerCase() !== pending.email) {
      return res.json({
        success: false,
        error: "Email mismatch. Please request a new code.",
      });
    }

    // Check if code expired
    if (Date.now() > pending.expiry) {
      delete req.session.pendingVerification;
      return res.json({
        success: false,
        error: "Verification code expired. Please request a new one.",
      });
    }

    // Check if code matches
    if (code !== pending.code) {
      return res.json({ success: false, error: "Invalid verification code" });
    }

    // Code is valid - mark as verified
    req.session.emailVerified = true;
    req.session.verifiedEmail = pending.email;

    // Clean up
    delete req.session.pendingVerification;

    res.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    console.error("Verify email code error:", error);
    res.json({ success: false, error: "Failed to verify code" });
  }
});
// **NEW**: Save email verification to user profile
app.post(
  "/api/save-email-verification",
  isLoggedIn,
  findUser,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = req.userData;

      if (
        !email ||
        !req.session.emailVerified ||
        req.session.verifiedEmail !== email.toLowerCase()
      ) {
        return res.json({
          success: false,
          error: "Email verification session invalid",
        });
      }

      // Update user's email and verification status
      user.email = email.toLowerCase().trim();
      user.isEmailVerified = true;

      await user.save();

      // Update session user data
      req.session.user = user;

      // Clean up verification session data
      delete req.session.emailVerified;
      delete req.session.verifiedEmail;

      console.log(
        `Email verification saved for user: ${user.username}, email: ${user.email}`
      );

      res.json({
        success: true,
        message: "Email verification saved successfully!",
      });
    } catch (error) {
      console.error("Save email verification error:", error);
      res.json({
        success: false,
        error: "Failed to save email verification",
      });
    }
  }
);
// Notification API Routes
app.get("/api/notifications", isLoggedIn, async (req, res) => {
  try {
    const notifications = await NotificationService.getUserNotifications(
      req.session.userId,
      20,
      false
    );
    const unreadCount = await NotificationService.getUnreadCount(
      req.session.userId
    );

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
app.post("/api/notifications/:id/read", isLoggedIn, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(
      req.params.id,
      req.session.userId
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found" });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, error: "Failed to mark as read" });
  }
});

// Mark all notifications as read
app.post("/api/notifications/mark-all-read", isLoggedIn, async (req, res) => {
  try {
    const count = await NotificationService.markAllAsRead(req.session.userId);
    res.json({ success: true, markedCount: count });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark all as read" });
  }
});

// Check and create email notification for current user
app.post("/api/notifications/check-email", isLoggedIn, async (req, res) => {
  try {
    const created = await NotificationService.checkAndCreateEmailNotification(
      req.session.userId
    );
    res.json({ success: true, notificationCreated: created });
  } catch (error) {
    console.error("Error checking email notification:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to check email notification" });
  }
});

// Forgot Password Routes
app.get("/forgot-password", (req, res) => {
  if (req.session.userId) {
    // User is already logged in
    return res.redirect("/home");
  }
  res.render("forgot-password");
});

app.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.json({ success: false, error: "Email address is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({
        success: false,
        error: "Please provide a valid email address",
      });
    }

    // Find user with this email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({
        success: false,
        error:
          "No account found with this email address. Please check your email or contact support.",
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to user
    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = resetExpiry;
    await user.save();

    // Send reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.name || user.username
    );

    if (!emailResult.success) {
      // Clean up token on email failure
      user.passwordResetToken = null;
      user.passwordResetExpiry = null;
      await user.save();

      return res.json({
        success: false,
        error: "Failed to send reset email. Please try again later.",
      });
    }

    console.log(
      `Password reset requested for user: ${user.username}, email: ${user.email}`
    );

    res.json({
      success: true,
      message: "Password reset instructions sent to your email address",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.json({
      success: false,
      error: "An error occurred. Please try again later.",
    });
  }
});

// Reset Password Routes
app.get("/reset-password", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.render("forgot-password", {
        error:
          "Invalid or missing reset token. Please request a new password reset.",
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.render("forgot-password", {
        error:
          "Invalid or expired reset token. Please request a new password reset.",
      });
    }

    // Token is valid, show reset form
    res.render("reset-password", { token });
  } catch (error) {
    console.error("Reset password GET error:", error);
    res.render("forgot-password", {
      error: "An error occurred. Please try again.",
    });
  }
});
app.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validation
    if (!token || !password || !confirmPassword) {
      return res.json({
        success: false,
        error: "All fields are required",
      });
    }

    if (password.length < 5) {
      return res.json({
        success: false,
        error: "Password must be at least 5 characters long",
      });
    }

    if (password !== confirmPassword) {
      return res.json({
        success: false,
        error: "Passwords do not match",
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.json({
        success: false,
        error:
          "Invalid or expired reset token. Please request a new password reset.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save();

    console.log(`Password successfully reset for user: ${user.username}`);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password POST error:", error);
    res.json({
      success: false,
      error: "An error occurred. Please try again later.",
    });
  }
});
app.get("/terms", (req, res) => {
  res.render("terms", {
    title: "Terms and Conditions - D'amour Muslim",
  });
});
app.get("/privacy", (req, res) => {
  res.render("privacy", {
    title: "Privacy Policy - D'amour Muslim",
  });
});
// **UPDATED**: Dynamic blog routes

// Public blog listing page
// Replace the existing /blog route with this updated version

app.get("/blog",requireOnboardingComplete, async (req, res) => {
  try {
    const { category, tag } = req.query;

    // **NEW**: Define static blogs that were previously hardcoded
    const staticBlogs = [
      {
        title: "Ultimate Guide to Hiring a Muslim Wedding Planner: Everything You Need to Know",
        excerpt: "Planning a wedding is exciting — but for Muslim couples, it also comes with additional values, traditions, and sensitivities. Learn everything you need to know about hiring the right Muslim wedding planner.",
        author: { name: "D'amour Muslim Team" },
        publishedAt: new Date("2025-01-11"),
        category: "Wedding Planning",
        tags: ["wedding", "planning", "muslim", "guide"],
        slug: "muslim-wedding-planner-guide",
        featuredImage: {
          url: "https://res.cloudinary.com/dhuc2plh0/image/upload/f_auto,q_auto:eco,w_800,h_450,c_fill,g_auto/v1760870954/jubair-ahmed-himu-5b0jgXvfimE-unsplash_tmjkew.jpg",
          alt: "Muslim Wedding Planning Guide"
        },
        isStatic: true // Flag to identify static blogs
      },
      {
        title: "UK Rishta WhatsApp Group: Your Gateway to Halal Marriage",
        excerpt: "Join our verified UK rishta WhatsApp group where serious Muslims connect for halal marriage. Discover how to find your perfect match through our trusted, moderated community across London, Leicester and the UK.",
        author: { name: "D'amour Muslim Team" },
        publishedAt: new Date("2025-01-15"),
        category: "Muslim Rishta",
        tags: ["rishta", "whatsapp", "uk", "halal", "marriage"],
        slug: "uk-rishta-whatsapp-group",
        featuredImage: {
          url: "https://res.cloudinary.com/dhuc2plh0/image/upload/f_auto,q_auto:eco,w_800,h_450,c_fill,g_auto/v1760870946/brett-jordan-dMUeHGE8Dio-unsplash_eozw9p.jpg",
          alt: "UK Rishta WhatsApp Group"
        },
        isStatic: true
      },
      {
        title: "UK Muslim Rishta Service: Affordable Registration Fees & Matchmaking Charges (2025)",
        excerpt: "Discover transparent pricing for D'Amour Muslim's rishta service with four flexible plans: Standard (Free), Premium (£50), Premium Plus (£100+£200), and Executive (£150+£450). 100% money-back guarantee included.",
        author: { name: "D'amour Muslim Team" },
        publishedAt: new Date("2025-01-20"),
        category: "Rishta Services",
        tags: ["pricing", "rishta", "service", "uk", "charges"],
        slug: "uk-muslim-rishta-service-charges",
        featuredImage: {
          url: "https://res.cloudinary.com/dhuc2plh0/image/upload/f_auto,q_auto:eco,w_800,h_450,c_fill,g_auto/v1760870921/jubair-ahmed-himu-XILfo8IMMjc-unsplash_qffxew.jpg",
          alt: "UK Muslim Rishta Service Pricing"
        },
        isStatic: true
      }
    ];

    // Build query for published blogs only
    let query = { isPublished: true };

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    // Get database blogs
    const databaseBlogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .select('title excerpt slug category tags publishedAt author featuredImage');

    // **NEW**: Filter static blogs based on query parameters
    let filteredStaticBlogs = staticBlogs;

    if (category) {
      filteredStaticBlogs = staticBlogs.filter(blog =>
        blog.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (tag) {
      filteredStaticBlogs = filteredStaticBlogs.filter(blog =>
        blog.tags.some(blogTag => blogTag.toLowerCase() === tag.toLowerCase())
      );
    }

    // **NEW**: Combine database and static blogs, then sort by publishedAt
    const allBlogs = [...databaseBlogs, ...filteredStaticBlogs];
    const sortedBlogs = allBlogs.sort((a, b) =>
      new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    // Get all categories and tags for filters (including static blogs)
    const allBlogsForFilters = [...databaseBlogs, ...staticBlogs];
    const categories = [...new Set(allBlogsForFilters.map(blog => blog.category))];
    const allTags = allBlogsForFilters.reduce((tags, blog) => {
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => tags.add(tag));
      }
      return tags;
    }, new Set());

    res.render("blog/index", {
      title: "Blog - D'amour Muslim",
      posts: sortedBlogs, // Combined and sorted blogs
      categories,
      tags: Array.from(allTags),
      currentCategory: category || null,
      currentTag: tag || null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Blog listing error:", error);
    res.render("blog/index", {
      title: "Blog - D'amour Muslim",
      posts: [], // Empty posts array on error
      categories: [],
      tags: [],
      currentCategory: null,
      currentTag: null,
      user: req.session.user || null,
    });
  }
});

// Public individual blog page

app.get("/blog/:slug",requireOnboardingComplete, async (req, res) => {
  try {
    const { slug } = req.params;

    // **NEW**: Check for static blog templates first
    const staticBlogTemplates = [
      "muslim-wedding-planner-guide",
      "uk-rishta-whatsapp-group",
      "uk-muslim-rishta-service-charges"
    ];

    if (staticBlogTemplates.includes(slug)) {
      // Render the specific static template
      return res.render(`blog/${slug}`, {
        user: req.session.user || null,
      });
    }

    // **EXISTING**: Check database for dynamic blogs
    const blog = await Blog.findOne({
      slug: slug,
      isPublished: true
    });

    if (!blog) {
      return res.status(404).render("404", {
        title: "Blog Post Not Found - D'amour Muslim",
        url: req.originalUrl,
      });
    }

    // Get related blogs (same category, excluding current blog)
    const relatedBlogs = await Blog.find({
      isPublished: true,
      category: blog.category,
      _id: { $ne: blog._id }
    })
      .sort({ publishedAt: -1 })
      .limit(3)
      .select('title excerpt slug publishedAt');

    // Generate structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": blog.title,
      "description": blog.excerpt || blog.metaDescription,
      "image": blog.featuredImage?.url || "",
      "author": {
        "@type": "Organization",
        "name": blog.author.name || "D'amour Muslim Team"
      },
      "publisher": {
        "@type": "Organization",
        "name": "D'amour Muslim",
        "logo": {
          "@type": "ImageObject",
          "url": "https://damourmuslim.com/images/logo.png"
        }
      },
      "datePublished": blog.publishedAt?.toISOString(),
      "dateModified": blog.updatedAt.toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://damourmuslim.com/blog/${blog.slug}`
      }
    };

    res.render("blog/post", {
      title: blog.metaTitle || `${blog.title} - D'amour Muslim`,
      metaDescription: blog.metaDescription || blog.excerpt,
      canonicalUrl: blog.canonicalUrl || `https://damourmuslim.com/blog/${blog.slug}`,
      blog,
      relatedBlogs,
      structuredData,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Individual blog error:", error);
    res.status(404).render("404", {
      title: "Blog Post Not Found - D'amour Muslim",
      url: req.originalUrl,
    });
  }
});
// Update the sitemap.xml route to include static blogs
app.get("/sitemap.xml", async (req, res) => {
  try {
    const users = await User.find({}).select("_id updatedAt profileSlug");
    const blogs = await Blog.find({ isPublished: true }).select("slug updatedAt publishedAt");

    // **NEW**: Static blog slugs
    const staticBlogs = [
      { slug: "muslim-wedding-planner-guide", lastmod: "2025-01-11" },
      { slug: "uk-rishta-whatsapp-group", lastmod: "2025-01-15" },
      { slug: "uk-muslim-rishta-service-charges", lastmod: "2025-01-20" }
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://damourmuslim.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://damourmuslim.com/profiles</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://damourmuslim.com/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add database blog posts
    blogs.forEach((blog) => {
      const lastmod = blog.updatedAt
        ? blog.updatedAt.toISOString().split("T")[0]
        : blog.publishedAt.toISOString().split("T")[0];
      sitemap += `
  <url>
    <loc>https://damourmuslim.com/blog/${blog.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // **NEW**: Add static blog posts
    staticBlogs.forEach((blog) => {
      sitemap += `
  <url>
    <loc>https://damourmuslim.com/blog/${blog.slug}</loc>
    <lastmod>${blog.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // Add profile URLs (existing code continues...)
    users.forEach((user) => {
      if (user.profileSlug) {
        const lastmod = user.updatedAt
          ? user.updatedAt.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        sitemap += `
  <url>
    <loc>https://damourmuslim.com/profiles/${user.profileSlug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    });

    sitemap += `
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});
// SEO: Robots.txt
app.get("/robots.txt", (req, res) => {
  const robots = `User-agent: *
Allow: /
Allow: /profiles
Allow: /profile
Allow: /profiles?gender=male
Allow: /profiles?gender=female
Allow: /register
Allow: /login
Disallow: /admin/
Disallow: /account/
Disallow: /api/
Disallow: /logout

Sitemap: https://damourmuslim.com/sitemap.xml`;

  res.set("Content-Type", "text/plain");
  res.send(robots);
});
// ============================================
// SEO ADMIN PANEL ROUTES
// ============================================

// SEO Admin Login Page
app.get("/seoadmin/login", (req, res) => {
  if (req.session.isSeoAdmin) {
    return res.redirect("/seoadmin/dashboard");
  }
  res.render("seoadmin/login", { error: null });
});

// SEO Admin Login Handler
app.post("/seoadmin/login", (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.SEO_ADMIN_PASSWORD) {
    req.session.isSeoAdmin = true;
    return res.redirect("/seoadmin/dashboard");
  }
  
  res.render("seoadmin/login", { error: "Invalid password" });
});

// SEO Admin Logout
app.get("/seoadmin/logout", (req, res) => {
  req.session.isSeoAdmin = false;
  res.redirect("/seoadmin/login");
});

// SEO Admin Dashboard
app.get("/seoadmin/dashboard", requireSeoAdmin, async (req, res) => {
  try {
    const stats = {
      totalProfiles: await User.countDocuments(),
      customSeoProfiles: await User.countDocuments({
        $or: [
          { "seoSettings.customMetaTitle": { $exists: true, $ne: "" } },
          { "seoSettings.customMetaDescription": { $exists: true, $ne: "" } }
        ]
      }),
      noIndexProfiles: await User.countDocuments({ "seoSettings.noIndex": true }),
      totalBlogs: await Blog.countDocuments(),
      profilesWithCustomTitle: await User.countDocuments({ "seoSettings.customMetaTitle": { $exists: true, $ne: "" } }),
      profilesWithCustomDesc: await User.countDocuments({ "seoSettings.customMetaDescription": { $exists: true, $ne: "" } }),
      approvedProfiles: await User.countDocuments({ isApproved: true, "seoSettings.noIndex": { $ne: true } })
    };
    
    // Get recent SEO edits
    const recentEdits = await User.find({ "seoSettings.lastSeoEditedAt": { $exists: true } })
      .sort({ "seoSettings.lastSeoEditedAt": -1 })
      .limit(5)
      .select("username profilePic seoSettings");
    
    res.render("seoadmin/dashboard", { stats, recentEdits });
  } catch (error) {
    console.error("SEO Dashboard error:", error);
    res.status(500).send("Error loading dashboard");
  }
});

// SEO Admin - Profile Listing
app.get("/seoadmin/profiles", requireSeoAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const { search, gender, filter } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { ethnicity: { $regex: search, $options: "i" } },
        { profileSlug: { $regex: search, $options: "i" } }
      ];
    }
    
    // Gender filter
    if (gender) {
      query.gender = gender;
    }
    
    // SEO status filter
    if (filter === "hasCustomSeo") {
      query.$or = [
        { "seoSettings.customMetaTitle": { $exists: true, $ne: "" } },
        { "seoSettings.customMetaDescription": { $exists: true, $ne: "" } }
      ];
    } else if (filter === "noCustomSeo") {
      query.$and = [
        { $or: [{ "seoSettings.customMetaTitle": { $exists: false } }, { "seoSettings.customMetaTitle": "" }] },
        { $or: [{ "seoSettings.customMetaDescription": { $exists: false } }, { "seoSettings.customMetaDescription": "" }] }
      ];
    } else if (filter === "noIndex") {
      query["seoSettings.noIndex"] = true;
    } else if (filter === "approved") {
      query.isApproved = true;
    }
    
    const profiles = await User.find(query)
      .sort({ "seoSettings.lastSeoEditedAt": -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("username gender age city ethnicity profilePic profileSlug isApproved seoSettings");
    
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.render("seoadmin/profiles", {
      profiles,
      currentPage: page,
      totalPages,
      totalCount,
      search: search || "",
      gender: gender || "",
      filter: filter || ""
    });
  } catch (error) {
    console.error("SEO Profiles error:", error);
    res.status(500).send("Error loading profiles");
  }
});

// SEO Admin - Edit Profile SEO
app.get("/seoadmin/profile/:id", requireSeoAdmin, async (req, res) => {
  try {
    const profile = await User.findById(req.params.id);
    if (!profile) {
      return res.status(404).send("Profile not found");
    }
    
    res.render("seoadmin/editProfile", {
      profile,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("SEO Edit Profile error:", error);
    res.status(500).send("Error loading profile");
  }
});

// SEO Admin - Update Profile SEO
app.post("/seoadmin/profile/:id/update", requireSeoAdmin, async (req, res) => {
  try {
    const profile = await User.findById(req.params.id);
    if (!profile) {
      return res.status(404).send("Profile not found");
    }
    
    const {
      profileSlug,
      randomNameForSeo,
      customMetaTitle,
      customMetaDescription,
      focusKeyword,
      customKeywords,
      noIndex,
      ogImageOverride,
      canonicalUrlOverride,
      seoField1,
      seoField2,
      internalNotes
    } = req.body;
    
    // Handle profile slug update with validation
    if (profileSlug && profileSlug !== profile.profileSlug) {
      const previousSlug = profile.profileSlug;
      // Validate slug format (lowercase, alphanumeric, hyphens only)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(profileSlug)) {
        return res.redirect(`/seoadmin/profile/${req.params.id}?error=Invalid slug format. Use lowercase letters, numbers, and hyphens only.`);
      }
      
      // Check if slug already exists for another user
      const existingUser = await User.findOne({ 
        profileSlug: profileSlug, 
        _id: { $ne: profile._id } 
      });
      
      if (existingUser) {
        return res.redirect(`/seoadmin/profile/${req.params.id}?error=This profile slug is already in use by another profile.`);
      }
      
      // Update the slug
      profile.profileSlug = profileSlug;
      addProfileSlugHistory(profile, previousSlug, profile.profileSlug);
      console.log(
        `SEO Admin updated profile slug from ${previousSlug} to ${profile.profileSlug}`
      );
    }
    
    // Update root-level SEO fields
    profile.randomNameForSeo = randomNameForSeo || profile.randomNameForSeo;
    profile.seoField1 = seoField1 || "";
    profile.seoField2 = seoField2 || "";
    
    // Initialize seoSettings if not exists
    if (!profile.seoSettings) {
      profile.seoSettings = {};
    }
    
    // Update nested seoSettings
    profile.seoSettings.customMetaTitle = customMetaTitle || "";
    profile.seoSettings.customMetaDescription = customMetaDescription || "";
    profile.seoSettings.focusKeyword = focusKeyword || "";
    profile.seoSettings.customKeywords = customKeywords ? customKeywords.split(",").map(k => k.trim()).filter(k => k) : [];
    profile.seoSettings.noIndex = noIndex === "true";
    profile.seoSettings.ogImageOverride = ogImageOverride || "";
    profile.seoSettings.canonicalUrlOverride = canonicalUrlOverride || "";
    profile.seoSettings.internalNotes = internalNotes || "";
    profile.seoSettings.lastSeoEditedAt = new Date();
    profile.seoSettings.lastSeoEditedBy = "SEO Admin";
    
    await profile.save();
    
    res.redirect(`/seoadmin/profile/${req.params.id}?success=SEO settings updated successfully`);
  } catch (error) {
    console.error("SEO Update Profile error:", error);
    res.redirect(`/seoadmin/profile/${req.params.id}?error=Failed to update SEO settings`);
  }
});

// SEO Admin - Blog Listing
app.get("/seoadmin/blogs", requireSeoAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .select("title slug featuredImage status metaTitle metaDescription keywords views publishedAt");
    
    res.render("seoadmin/blogs", {
      blogs,
      search: search || "",
      status: status || ""
    });
  } catch (error) {
    console.error("SEO Blogs error:", error);
    res.status(500).send("Error loading blogs");
  }
});

// SEO Admin - Edit Blog SEO
app.get("/seoadmin/blog/:id", requireSeoAdmin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).send("Blog not found");
    }
    
    res.render("seoadmin/editBlog", {
      blog,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("SEO Edit Blog error:", error);
    res.status(500).send("Error loading blog");
  }
});

// SEO Admin - Update Blog SEO
app.post("/seoadmin/blog/:id/update", requireSeoAdmin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).send("Blog not found");
    }
    
    const {
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl,
      "faqQuestion[]": faqQuestions,
      "faqAnswer[]": faqAnswers
    } = req.body;
    
    blog.metaTitle = metaTitle || "";
    blog.metaDescription = metaDescription || "";
    blog.keywords = keywords ? keywords.split(",").map(k => k.trim()).filter(k => k) : [];
    blog.canonicalUrl = canonicalUrl || "";
    
    // Handle FAQ schema
    if (faqQuestions && faqAnswers) {
      const questions = Array.isArray(faqQuestions) ? faqQuestions : [faqQuestions];
      const answers = Array.isArray(faqAnswers) ? faqAnswers : [faqAnswers];
      
      blog.faqSchema = questions
        .map((q, i) => ({ question: q, answer: answers[i] || "" }))
        .filter(faq => faq.question && faq.answer);
    } else {
      blog.faqSchema = [];
    }
    
    await blog.save();
    
    res.redirect(`/seoadmin/blog/${req.params.id}?success=Blog SEO updated successfully`);
  } catch (error) {
    console.error("SEO Update Blog error:", error);
    res.redirect(`/seoadmin/blog/${req.params.id}?error=Failed to update blog SEO`);
  }
});

// SEO Admin - Global Settings
app.get("/seoadmin/global-settings", requireSeoAdmin, async (req, res) => {
  try {
    const settings = await GlobalSeoSettings.getSettings();
    
    res.render("seoadmin/globalSettings", {
      settings,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("SEO Global Settings error:", error);
    res.status(500).send("Error loading global settings");
  }
});

// SEO Admin - Update Global Settings
app.post("/seoadmin/global-settings/update", requireSeoAdmin, async (req, res) => {
  try {
    const {
      siteName,
      defaultMetaTitleSuffix,
      defaultMetaDescription,
      defaultOgImage,
      globalKeywords,
      twitterHandle,
      facebookPageUrl,
      instagramHandle,
      googleAnalyticsId,
      googleSearchConsoleVerification,
      bingVerification,
      homepageMetaTitle,
      homepageMetaDescription,
      profilesPageMetaTitle,
      profilesPageMetaDescription,
      organizationName,
      organizationUrl,
      organizationLogo,
      organizationEmail,
      organizationPhone,
      globalNoIndex,
      robotsTxtAdditions,
      footerSeoText
    } = req.body;
    
    const updates = {
      siteName,
      defaultMetaTitleSuffix,
      defaultMetaDescription,
      defaultOgImage,
      globalKeywords: globalKeywords ? globalKeywords.split(",").map(k => k.trim()).filter(k => k) : [],
      twitterHandle,
      facebookPageUrl,
      instagramHandle,
      googleAnalyticsId,
      googleSearchConsoleVerification,
      bingVerification,
      homepageMetaTitle,
      homepageMetaDescription,
      profilesPageMetaTitle,
      profilesPageMetaDescription,
      organizationName,
      organizationUrl,
      organizationLogo,
      organizationEmail,
      organizationPhone,
      globalNoIndex: globalNoIndex === "true",
      robotsTxtAdditions,
      footerSeoText
    };
    
    await GlobalSeoSettings.updateSettings(updates, "SEO Admin");
    
    res.redirect("/seoadmin/global-settings?success=Global settings updated successfully");
  } catch (error) {
    console.error("SEO Update Global Settings error:", error);
    res.redirect("/seoadmin/global-settings?error=Failed to update global settings");
  }
});

// SEO Admin - Redirect base /seoadmin to dashboard
app.get("/seoadmin", (req, res) => {
  if (req.session.isSeoAdmin) {
    return res.redirect("/seoadmin/dashboard");
  }
  res.redirect("/seoadmin/login");
});

// ============================================
// END SEO ADMIN ROUTES
// ============================================

app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found - D'amour Muslim",
    url: req.originalUrl,
  });
});
// **NEW**: Graceful shutdown handler
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Closing queue connections...");
  await QueueService.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Closing queue connections...");
  await QueueService.close();
  process.exit(0);
});
app.listen(port, (req, res) => {
  console.log("on port 3000!");
});
