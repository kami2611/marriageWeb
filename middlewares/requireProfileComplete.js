const User = require("../models/user");

module.exports = async function requireProfileComplete(req, res, next) {
  if (!req.session.userId) return next(); // Not logged in, let other middleware handle

  // Fetch latest user data
  const user = await User.findById(req.session.userId);

  // Check all required fields for a complete profile
  if (
    !user ||
    !user.age ||
    !user.name ||
    !user.gender ||
    !user.religion
    // !user.nationality ||
    // !user.country ||
    // !user.state ||
    // !user.city ||
    // !user.contact ||
    // !user.adress ||
    // !user.height ||
    // !user.complexion ||
    // !user.build ||
    // !user.eyeColor ||
    // !user.hairColor ||
    // !user.ethnicity ||
    // !user.maritalStatus ||
    // !user.work ||
    // !user.islamicSect ||
    // user.smoker === undefined ||
    // user.bornMuslim === undefined ||
    // user.prays === undefined ||
    // user.celebratesMilaad === undefined ||
    // user.celebrateKhatams === undefined ||
    // !user.livingArrangementsAfterMarriage ||
    // !user.futurePlans ||
    // !user.fatherName ||
    // !user.motherName ||
    // !user.fatherProfession ||
    // !user.aboutMe ||
    // user.willingToRelocate === undefined ||
    // !user.preferredAgeRange ||
    // !user.preferredHeightRange ||
    // !user.preferredCaste ||
    // !user.preferredEthnicity ||
    // user.allowParnterToWork === undefined ||
    // user.allowPartnerToStudy === undefined ||
    // user.acceptSomeoneInOtherCountry === undefined ||
    // !user.lookingForASpouseThatIs ||
    // user.willingToSharePhotosUponRequest === undefined ||
    // user.willingToMeetUpOutside === undefined ||
    // !user.whoCompletedProfile ||
    // !user.birthPlace ||
    // user.siblings === undefined ||
    // !user.describeNature ||
    // user.acceptSomeoneWithChildren === undefined ||
    // user.acceptADivorcedPerson === undefined ||
    // user.agreesWithPolygamy === undefined ||
    // user.acceptAWidow === undefined ||
    // user.AcceptSomeoneWithBeard === undefined ||
    // user.AcceptSomeoneWithHijab === undefined ||
    // user.ConsiderARevert === undefined ||
    // user.willingToConsiderANonUkCitizen === undefined ||
    // !user.languagesSpoken ||
    // user.languagesSpoken.length === 0 ||
    // !user.hobbies ||
    // user.hobbies.length === 0 ||
    // !user.QualitiesThatYouCanBringToYourMarriage ||
    // user.QualitiesThatYouCanBringToYourMarriage.length === 0 ||
    // !user.qualitiesYouNeedInYourPartner ||
    // user.qualitiesYouNeedInYourPartner.length === 0,
  ) {
    return res.redirect(
      "/account/info?msg=You must complete your profile before continuing."
    );
  }
  next();
};
