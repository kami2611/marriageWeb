const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    interestedIn: {
      type: String,
      required: true,
      enum: ["male", "female", "both"],
    },
    preferredAgeRange: {
      type: String,
      enum: ["18-25", "26-30", "31-35", "36-40", "41+"],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    lastEmailSent: {
      type: Date,
      default: null,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      default: "website",
    },
  },
  {
    timestamps: true,
  }
);
// Keep only the other indexes that don't conflict:
newsletterSchema.index({ isActive: 1 });
newsletterSchema.index({ interestedIn: 1 });

module.exports = mongoose.model("Newsletter", newsletterSchema);
