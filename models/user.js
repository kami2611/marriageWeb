// this is user.js model
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  age: {
    type: Number,
  },
  password: {
    type: String,
    required: true,
  },
  adress: {
    type: String,
    // required: true,
  },
  city: {
    type: String,
    // required: true,
  },
  contact: {
    type: Number,
    // required: true,
  },
  gender: {
    type: String,
    // enum: ["male", "female", "rather not say", "N/A"],
  },
  religion: {
    type: String,
  },
  caste: {
    type: String,
  },
  peopleInterested: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],
  likeRequests: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Request",
    },
  ],
  canAccessFullProfileOf: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],

  profilePic: {
    url: String,
    filename: String,
  },
  coverPhoto: {
    url: String,
    filename: String,
  },
  country: {
    type: String,
  },
  state: {
    type: String,
  },
  eyeColor: {
    type: String,
    // enum: ["black", "brown", "grey", "other", "N/A"],
  },
  wearHijab: {
    type: String,
  },
  beard: {
    type: String,
  },
  hairColor: {
    type: String,
    // enum: ["black", "brown", "blonde", "N/A"],
  },
  complexion: {
    type: String,
    // enum: ["fair", "wheatish", "dark", "N/A"],
  },
  build: {
    type: String,
    // enum: ["slim", "average", "athletic", "heavy", "N/A"],
  },
  height: {
    type: Number, // height in centimeters or your preferred unit
  },
  languagesSpoken: [
    {
      type: String,
    },
  ],
  education: [
    {
      title: { type: String },
      institute: { type: String },
      year: { type: String },
    },
  ],
  work: {
    type: String, // e.g., "Software Engineer", "Doctor", etc.
  },
  nationality: {
    type: String,
  },
  ethnicity: {
    type: String,
    // enum: ["bangladeshi", "pakistani", "indian", "british", "other", "N/A"],
  },
  maritalStatus: {
    type: String,
    // enum: ["married", "unmarried", "divorced", "widowed", "separated", "N/A"],
  },
  disability: {
    type: String,
    default: "no",
  },
  smoker: {
    type: Boolean,
  },
  bornMuslim: {
    type: Boolean,
  },
  islamicSect: {
    type: String,
  },
  prays: {
    type: Boolean,
  },
  celebratesMilaad: {
    type: Boolean,
  },
  celebrateKhatams: {
    type: Boolean,
  },
  islamIsImportantToMeInfo: {
    type: String,
  },
  acceptSomeoneWithChildren: {
    type: Boolean,
  },
  acceptADivorcedPerson: {
    type: Boolean,
  },
  agreesWithPolygamy: {
    type: Boolean,
  },
  acceptAWidow: {
    type: Boolean,
  },
  AcceptSomeoneWithBeard: {
    type: Boolean,
  },
  AcceptSomeoneWithHijab: {
    type: Boolean,
  },
  ConsiderARevert: {
    type: Boolean,
  },
  livingArrangementsAfterMarriage: {
    type: String,
    // enum: [
    //   "live with parents",
    //   "live alone",
    //   "live with spouse",
    //   "other",
    //   "N/A",
    // ],
  },
  futurePlans: {
    type: String,
    // enum: ["settle abroad", "stay in current country", "other", "N/A"],
  },
  describeNature: {
    type: String,
  },
  QualitiesThatYouCanBringToYourMarriage: [
    {
      type: String,
    },
  ],
  fatherName: {
    type: String,
  },
  motherName: {
    type: String,
  },
  fatherProfession: {
    type: String,
  },
  aboutMe: {
    type: String,
  },
  hobbies: [
    {
      type: String,
    },
  ],
  willingToRelocate: {
    type: Boolean,
  },

  //what are you looking for.
  preferredAgeRange: {
    type: String, // e.g., "25-30"
  },
  preferredHeightRange: {
    type: String, // e.g., "150-180 cm"
  },
  preferredCaste: {
    type: String, // e.g., "any", "specific caste"
  },
  preferredEthnicity: {
    type: String, // e.g.,
  },
  allowParnterToWork: {
    type: Boolean, // true = yes, false = no
  },
  allowPartnerToStudy: {
    type: Boolean, // true = yes, false = no
  },
  acceptSomeoneInOtherCountry: {
    type: Boolean, // true = yes, false = no
  },
  qualitiesYouNeedInYourPartner: [{ type: String }],
  lookingForASpouseThatIs: {
    type: String, // e.g., "educated", "religious", "career-oriented"
  },
  willingToSharePhotosUponRequest: {
    type: Boolean, // true = yes, false = no
  },
  willingToMeetUpOutside: {
    type: Boolean, // true = yes, false = no
  },
  waliMyContactDetails: {
    type: String, // e.g., "wali's contact details"
  },
  whoCompletedProfile: {
    type: String, // e.g., "self", "family member"
  },
  siblings: {
    type: Number,
    default: 0,
  },
  birthPlace: {
    type: String,
  },
  children: [
    {
      name: { type: String },
      age: { type: Number },
      livingLocation: { type: String },
    },
  ],
  anySpecialInformationPeopleShouldKnow: {
    type: String, // e.g., "any special information"
  },
  willingToConsiderANonUkCitizen: {
    type: Boolean, // true = yes, false = no
  },
  profileSlug: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents without this field
    index: true, // For faster lookups
  },
  registrationSource: {
    type: String,
    enum: ["register", "admin"],
    default: "register",
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("User", userSchema);
