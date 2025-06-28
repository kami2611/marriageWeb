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
});
module.exports = mongoose.model("User", userSchema);
