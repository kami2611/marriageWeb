const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
const { generateUniqueSlug } = require("../utils/profileHelpers");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      passReqToCallback: true, // **ADD THIS**
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log(
          "Google OAuth callback triggered for:",
          profile.displayName
        );

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log("Existing Google user found:", user.username);
          return done(null, user);
        }

        // Check if user exists with this email
        if (profile.emails && profile.emails.length > 0) {
          const email = profile.emails[0].value;
          user = await User.findOne({ email: email.toLowerCase() });

          if (user) {
            console.log(
              "Linking Google account to existing user:",
              user.username
            );
            // Link Google account to existing user
            user.googleId = profile.id;
            if (profile.photos && profile.photos.length > 0) {
              user.googleProfilePic = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }
        }

        // **FIXED**: Generate username first, then use it for both username and slug generation
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : null;
        const profilePic =
          profile.photos && profile.photos.length > 0
            ? profile.photos[0].value
            : null;

        // **FIX 1**: Generate a proper username format instead of using displayName directly
        // Check if there's a verified mobile in session to determine gender prefix
        let baseUsername = "G"; // Default to 'G' for Google users

        // Try to determine gender from session if available
        if (req.session && req.session.tempUserId) {
          const tempUser = await User.findById(req.session.tempUserId);
          if (tempUser && tempUser.gender) {
            baseUsername = tempUser.gender === "male" ? "M" : "F";
          }
        }

        // Find the next available number for this prefix
        const regex = new RegExp(`^${baseUsername}(\\d+)$`);
        const existingUsers = await User.find({
          username: { $regex: regex },
        }).select("username");
        let maxNum = 0;
        existingUsers.forEach((u) => {
          const match = u.username.match(regex);
          if (match && Number(match[1]) > maxNum) {
            maxNum = Number(match[1]);
          }
        });
        const username = `${baseUsername}${maxNum + 1}`;

        console.log("Creating new Google user with username:", username);

        const userData = {
          googleId: profile.id,
          username: username, // **FIXED**: Use generated username, not displayName
          name: profile.displayName, // **FIXED**: Keep displayName as name field
          email: email ? email.toLowerCase() : null,
          isEmailVerified: email ? true : false,
          googleProfilePic: profilePic,
          registrationSource: "google",
          password:
            "google_oauth_" + Math.random().toString(36).substring(2, 15),
        };

        // **FIX 2**: Add verified mobile and gender if exists in session
        if (req.session && req.session.verifiedMobile) {
          userData.contact = req.session.verifiedMobile;
        }

        // **FIX 3**: If we have temp user data from the registration flow, merge it
        if (req.session && req.session.tempUserId) {
          const tempUser = await User.findById(req.session.tempUserId);
          if (tempUser) {
            userData.gender = tempUser.gender; // **CRITICAL FIX**: Preserve gender
            userData.contact = tempUser.contact || userData.contact; // Preserve contact
            userData.username = tempUser.username; // **CRITICAL FIX**: Use the already generated username

            // Delete the temp user since we're creating the real one
            await User.findByIdAndDelete(req.session.tempUserId);
            delete req.session.tempUserId;
          }
        }

        const newUser = new User(userData);

        // Generate profile slug using the correct username
        newUser.profileSlug = await generateUniqueSlug(newUser);

        await newUser.save();
        console.log("New Google user created successfully:", newUser.username);

        return done(null, newUser);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
