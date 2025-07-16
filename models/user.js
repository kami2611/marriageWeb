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
    enum: ["male", "female", "rather not say"],
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
  country: {
    type: String,
  },
  state: {
    type: String,
  },
  eyeColor: {
    type: String,
    enum: ["black", "brown", "grey", "other"],
  },
  hairColor: {
    type: String,
    enum: ["black", "brown", "blonde"],
  },
  complexion: {
    type: String,
    enum: ["fair", "wheatish", "dark"],
  },
  build: {
    type: String,
    enum: ["slim", "average", "athletic", "heavy"],
  },
  height: {
    type: Number, // height in centimeters or your preferred unit
  },
  languagesSpoken: [
    {
      type: String,
    },
  ],
  education: {
    type: String,
  },
  nationality: {
    type: String,
  },
  ethnicity: {
    type: String,
    enum: ["asian", "african", "caucasian", "latino", "arab", "other"],
  },
  maritalStatus: {
    type: Boolean, // true = married, false = unmarried
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
    enum: ["live with parents", "live alone", "live with spouse", "other"],
  },
  futurePlans: {
    type: String,
    enum: ["settle abroad", "stay in current country", "other"],
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
  qualitiesYouNeedInYourPartner: [{ type: Boolean }],
  lookingForASpouseThatIs: {
    type: String, // e.g., "educated", "religious", "career-oriented"
  },
  willingToSharePhotosUponRequest: {
    type: Boolean, // true = yes, false = no
  },
  willingToMeetUpOutside: {
    type: Boolean, // true = yes, false = no
  },
  whoCompletedProfile: {
    type: String, // e.g., "self", "family member"
  },
});
module.exports = mongoose.model("User", userSchema);
