const mongoose = require("mongoose");
const requestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  to: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["accepted", "rejected", "pending"],
    default: "pending",
  },
});
module.exports = mongoose.model("Request", requestSchema);
