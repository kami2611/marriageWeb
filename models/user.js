const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
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
    required: true,
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
    enum: ["islam", "hinduism", "christianity", "other"],
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
  profilesYouHaveFullAccessTo: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],
});
module.exports = mongoose.model("User", userSchema);
