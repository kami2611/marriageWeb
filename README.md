# 🔐 Profile Connect Web App

A Node.js + Express + MongoDB web application where users can view limited public profiles, request access to full profiles, and manage data sharing with mutual consent — complete with profile image uploads and cloud-based storage.

---

## 🚀 Features

- 🧑‍🤝‍🧑 **Limited Profile Viewing:**  
  Authenticated users can browse other users' limited profile info.

- 🔄 **Profile Access Requests:**  
  Users can send full-profile access requests to others, sharing their own full profile in the process.

- ✅ **Mutual Consent Model:**  
  Once the receiver accepts, both users start sharing full profiles.

- ❌ **Cancel Requests:**  
  Pending requests can be canceled before they're accepted or declined.

- 🔓 **Revoke Access Anytime:**  
  Either user can revoke access to their full profile at any time.

- 🖼️ **Profile Image Uploads:**  
  Users can upload profile pictures via **Multer**.

- ☁️ **Cloud Storage:**  
  Images are stored securely on **Cloudinary**.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js  
- **Database:** MongoDB + Mongoose  
- **Templating Engine:** EJS (or any other used)  
- **Image Upload:** Multer  
- **Image Hosting:** Cloudinary  
- **Session Management:** express-session  
- **Authentication (Optional):** Passport.js (if used)

---

🧠 How It Works:

Limited Profiles: Users view others' public profile info (e.g., name, city, short bio).

Send Full Access Request: A user sends their full profile to request full access from someone else.

Accept or Decline: The receiver decides. If accepted, both profiles become visible to each other.

Cancel or Revoke: Senders can cancel unaccepted requests; any party can revoke sharing later.


📦 Installation:

git clone https://github.com/kami2611/marriageWeb.git
cd marriageWeb
npm install

Set up your .env file with:
PASSCODE = yourChoice
SECRETKEYSESSION = YourChoice
CLOUD_NAME = YourCloudName
CLOUDINARY_KEY = yourCloudinaryKey
CLOUDINARY_SECRET = YourCloudinarySecret


📣 Upcoming Features:

Real-time notifications for access requests
Optional messaging system


