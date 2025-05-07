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
  interestedIn: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],
});
module.exports = mongoose.model("User", userSchema);
