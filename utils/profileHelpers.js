const slugify = require("slugify");
const User = require("../models/user");
function calculateProfileCompletion(user) {
  const totalFields = 64; // Total possible fields

  let completedFields = 0;

  // Check each field in the user object
  Object.keys(user.toObject()).forEach((key) => {
    const value = user[key];
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      value !== "N/A"
    ) {
      if (Array.isArray(value) && value.length > 0) {
        completedFields++;
      } else if (typeof value === "object" && !Array.isArray(value)) {
        // For nested objects like profilePic, coverPhoto
        if (value.url || Object.keys(value).length > 0) {
          completedFields++;
        }
      } else if (typeof value !== "object") {
        completedFields++;
      }
    }
  });

  const percentage = Math.round((completedFields / totalFields) * 100);
  return {
    completed: completedFields,
    total: totalFields,
    percentage: percentage,
  };
}
function generateProfileSlug(user) {
  // Use name if available, otherwise username
  const baseName = user.username;

  let parts = [baseName];

  // **FIXED**: Prioritize most specific to least specific location
  let locationPart = null;

  if (
    user.birthPlace &&
    user.birthPlace.trim() &&
    user.birthPlace.toLowerCase() !== "n/a"
  ) {
    locationPart = user.birthPlace;
  } else if (
    user.city &&
    user.city.trim() &&
    user.city.toLowerCase() !== "n/a"
  ) {
    locationPart = user.city;
  } else if (
    user.country &&
    user.country.trim() &&
    user.country.toLowerCase() !== "n/a"
  ) {
    locationPart = user.country;
  } else if (
    user.nationality &&
    user.nationality.trim() &&
    user.nationality.toLowerCase() !== "n/a"
  ) {
    locationPart = user.nationality;
  }

  if (locationPart) {
    parts.push(`from-${locationPart}`);
  }

  // Add age if available
  if (user.age) {
    parts.push(`${user.age}`);
  }

  // Join parts and slugify
  const slug = slugify(parts.join(" "), {
    lower: true,
    strict: true, // Remove special characters
    locale: "en",
  });

  return slug;
}
async function generateUniqueSlug(user) {
  let baseSlug = generateProfileSlug(user);
  let slug = baseSlug;
  let counter = 1;

  // Check if slug already exists
  while (await User.findOne({ profileSlug: slug, _id: { $ne: user._id } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

module.exports = {
  calculateProfileCompletion,
  generateProfileSlug,
  generateUniqueSlug,
};
