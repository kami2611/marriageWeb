const mongoose = require("mongoose");
const User = require("./models/user");
const Request = require("./models/Request");
const bcrypt = require("bcrypt");

mongoose
  .connect("mongodb://127.0.0.1:27017/marriageajs")
  .then(async () => {
    console.log("MongoDB Connected!");

    // Clear existing data
    await User.deleteMany({});
    await Request.deleteMany({});
    console.log("Old data deleted.");

    // Dummy data for users
    const userData = [
      {
        username: "kamran123",
        name: "Kamran",
        age: 21,
        password: "pass123",
        adress: "Street 1",
        city: "Karachi",
        contact: 3001234567,
        gender: "male",
        religion: "islam",
        cast: "padhiyar",
      },
      {
        username: "fatima456",
        name: "Fatima",
        age: 19,
        password: "secret456",
        adress: "Street 5",
        city: "Lahore",
        contact: 3027654321,
        gender: "female",
        religion: "islam",
        cast: "syed",
      },
      {
        username: "ahmed789",
        name: "Ahmed",
        age: 24,
        password: "mypwd",
        adress: "Block A",
        city: "Islamabad",
        contact: 3031111111,
        gender: "male",
        religion: "islam",
        cast: "memon",
      },
      {
        username: "sana321",
        name: "Sana",
        age: 22,
        password: "sanapass",
        adress: "Sector B",
        city: "Karachi",
        contact: 3042222222,
        gender: "female",
        religion: "islam",
        cast: "rajput",
      },
      {
        username: "zain999",
        name: "Zain",
        age: 26,
        password: "zainzain",
        adress: "Lane 6",
        city: "Rawalpindi",
        contact: 3053333333,
        gender: "male",
        religion: "islam",
        cast: "jutt",
      },
      {
        username: "aliya555",
        name: "Aliya",
        age: 20,
        password: "aliyalove",
        adress: "Main Road",
        city: "Multan",
        contact: 3064444444,
        gender: "female",
        religion: "islam",
        cast: "sheikh",
      },
      {
        username: "usman007",
        name: "Usman",
        age: 23,
        password: "usmanrocks",
        adress: "Colony 4",
        city: "Peshawar",
        contact: 3075555555,
        gender: "male",
        religion: "islam",
        cast: "ansari",
      },
      {
        username: "hira786",
        name: "Hira",
        age: 25,
        password: "hirapass",
        adress: "Flat 2",
        city: "Quetta",
        contact: 3086666666,
        gender: "female",
        religion: "islam",
        cast: "yousafzai",
      },
      {
        username: "fahad101",
        name: "Fahad",
        age: 27,
        password: "fahad2020",
        adress: "Garden West",
        city: "Hyderabad",
        contact: 3097777777,
        gender: "male",
        religion: "islam",
        cast: "gujjar",
      },
      {
        username: "nimra333",
        name: "Nimra",
        age: 22,
        password: "nimra22",
        adress: "Sector Z",
        city: "Faisalabad",
        contact: 3108888888,
        gender: "female",
        religion: "islam",
        cast: "choudhary",
      },
      {
        username: "bilal000",
        name: "Bilal",
        age: 24,
        password: "bilalpass",
        adress: "Phase 8",
        city: "Lahore",
        contact: 3119999999,
        gender: "male",
        religion: "islam",
        cast: "khan",
      },
      {
        username: "iqra444",
        name: "Iqra",
        age: 20,
        password: "iqra123",
        adress: "Street 9",
        city: "Sialkot",
        contact: 3121234567,
        gender: "female",
        religion: "islam",
        cast: "shaikh",
      },
      {
        username: "arsalan88",
        name: "Arsalan",
        age: 23,
        password: "arsalan88",
        adress: "Apt 10",
        city: "Bahawalpur",
        contact: 3137654321,
        gender: "male",
        religion: "islam",
        cast: "mirza",
      },
      {
        username: "mehwish111",
        name: "Mehwish",
        age: 21,
        password: "mehwishpw",
        adress: "Township",
        city: "Gujranwala",
        contact: 3149876543,
        gender: "female",
        religion: "islam",
        cast: "mughal",
      },
      {
        username: "hamza555",
        name: "Hamza",
        age: 22,
        password: "hamzapw",
        adress: "Gulberg",
        city: "Larkana",
        contact: 3151237890,
        gender: "male",
        religion: "islam",
        cast: "syed",
      },
    ];
    const hashedUserData = await Promise.all(
      userData.map(async (user) => {
        const hashedPwd = await bcrypt.hash(user.password, 10);
        return { ...user, password: hashedPwd };
      })
    );

    // Insert all users
    const users = await User.insertMany(hashedUserData);
    console.log("15 users inserted.");

    // Create some random requests between users;
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("MongoDB Error:", err);
  });
