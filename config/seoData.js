const muslimMaleNames = [
  "Muhammad", "Ahmed", "Ali", "Hassan", "Hussain", "Omar", "Usman", "Bilal", "Hamza", "Yusuf",
  "Ibrahim", "Ismail", "Zain", "Zayn", "Asad", "Faisal", "Tariq", "Saad", "Salman", "Imran",
  "Adnan", "Fahad", "Khalid", "Rashid", "Nasir", "Amin", "Jawad", "Kamran", "Raza", "Rizwan",
  "Shahid", "Naveed", "Umer", "Umar", "Junaid", "Farhan", "Arslan", "Haroon", "Haris", "Owais",
  "Talha", "Abdullah", "Abdur Rahman", "Abdul Aziz", "Abdul Malik", "Mustafa", "Sami", "Waleed", "Zubair", "Yasir",
  "Anas", "Ayaan", "Ayub", "Azhar", "Danish", "Ehsan", "Fawad", "Furqan", "Haider", "Hamid",
  "Hanif", "Idris", "Ihsan", "Ikram", "Jalal", "Jameel", "Kashif", "Latif", "Majid", "Mansoor",
  "Mohsin", "Muazzam", "Mudassir", "Mujtaba", "Munir", "Nabil", "Nadeem", "Nadir", "Naeem", "Naseem",
  "Navid", "Niaz", "Noman", "Qasim", "Raheem", "Rahim", "Raees", "Rafiq", "Rehan", "Riaz",
  "Sabir", "Sadiq", "Saif", "Sajid", "Saleem", "Sameer", "Sarfraz", "Shahzad", "Shakeel", "Shams",
  "Sharif", "Shoaib", "Sohail", "Sulaiman", "Suleman", "Tahir", "Taimur", "Tanveer", "Tauqeer", "Waqar",
  "Waqas", "Yaseen", "Zaheer", "Zahid", "Zakir", "Zeeshan", "Abid", "Adeel", "Afzal", "Ahsan",
  "Aijaz", "Akbar", "Akram", "Amir", "Anwar", "Aqeel", "Arif", "Ashraf", "Asif", "Aslam",
  "Atif", "Atiq", "Awais", "Ayaz", "Azeem", "Aziz", "Babar", "Bashir", "Dawood", "Ejaz",
  "Farooq", "Fayyaz", "Ghulam", "Habib", "Hammad", "Hannan", "Haseeb", "Hashim", "Hidayat", "Hussam",
  "Iftikhar", "Ijaz", "Inam", "Intizar", "Iqbal", "Irfan", "Ishaq", "Javed", "Kamal", "Kareem",
  "Liaquat", "Luqman", "Mahmood", "Manzoor", "Masood", "Mazhar", "Mehboob", "Mehmood", "Mubarak", "Mubashir",
  "Mudassar", "Mufti", "Mujahid", "Mukhtar", "Mumtaz", "Muneeb", "Munib", "Murtaza", "Musharraf", "Musheer",
  "Muslim", "Mustapha", "Nabeel", "Nauman", "Nazir", "Noor", "Nouman", "Obaid", "Pervez", "Qadir",
  "Qamar", "Qasem", "Raashid", "Rafi", "Rahat", "Raihan", "Rameez", "Ramzan", "Rauf", "Rayyan"
];

const muslimFemaleNames = [
  "Fatima", "Aisha", "Maryam", "Zainab", "Khadija", "Hafsa", "Ruqayyah", "Umm Kulthum", "Safiya", "Sumaya",
  "Amina", "Asma", "Halima", "Sawda", "Maymuna", "Juwayriya", "Ramlah", "Zaynab", "Hawa", "Sara",
  "Hana", "Hiba", "Layla", "Noor", "Nura", "Sumayyah", "Yasmin", "Zara", "Aaliyah", "Abida",
  "Adila", "Afra", "Alima", "Amara", "Amira", "Anisa", "Areeba", "Arifa", "Asiya", "Ayesha",
  "Azra", "Basima", "Benazir", "Bushra", "Dania", "Dua", "Faiza", "Farida", "Fariha", "Ghazala",
  "Habiba", "Hadia", "Haleema", "Hamida", "Hanna", "Hasina", "Huda", "Iffat", "Iram", "Jamila",
  "Juwairiya", "Kalsoom", "Kanwal", "Kausar", "Kulsum", "Laiba", "Lubna", "Madiha", "Maheen", "Mahnoor",
  "Malaika", "Maleeha", "Manha", "Marwa", "Mehak", "Mehreen", "Mehnaz", "Muskan", "Nabila", "Nadia",
  "Nafeesa", "Nagina", "Naila", "Najma", "Naseem", "Nazia", "Nighat", "Nimra", "Noreen", "Nosheen",
  "Parveen", "Qurat", "Rabia", "Raeesa", "Rameen", "Ramsha", "Rania", "Rehana", "Rifat", "Rubina",
  "Ruksana", "Saba", "Sabiha", "Sabina", "Sadaf", "Sadia", "Safa", "Safia", "Sahar", "Saima",
  "Sajida", "Saliha", "Salma", "Samina", "Sana", "Saniya", "Shaista", "Shamim", "Shazia", "Shehnaz",
  "Shifa", "Sidra", "Sobia", "Sonia", "Sumaira", "Summaya", "Tahira", "Taiba", "Talha", "Tanzeela",
  "Tasneem", "Tayyaba", "Umama", "Umme", "Uzma", "Warda", "Yasmeen", "Zahida", "Zahra", "Zara",
  "Zeenat", "Zubaida", "Zuhra", "Aamna", "Abiha", "Adeela", "Afeefa", "Afshan", "Aiman", "Aiza",
  "Alisha", "Aliza", "Amna", "Anum", "Aqsa", "Arisha", "Arwa", "Asra", "Ayat", "Azka",
  "Baseera", "Bisma", "Duaa", "Eman", "Emaan", "Eshal", "Farah", "Fareeda", "Fizza", "Gulshan",
  "Hajra", "Haleema", "Haniya", "Hareem", "Humna", "Iqra", "Isha", "Javeria", "Kinza", "Laraib",
  "Mahira", "Maimuna", "Maira", "Maliha", "Marriam", "Mehwish", "Misbah", "Muneera", "Myra", "Nabiha",
  "Naima", "Nida", "Rabiya", "Raees", "Rafia", "Ramla", "Rayana", "Rida", "Rimsha", "Roshni"
];

const seoKeywords = [
  "Muslim marriage", "Muslim marriage UK", "Muslim marriage London", "Leicester Muslim marriage",
  "Muslim matrimony", "Muslim marriage site", "Marriage and Islam", "Muslim wedding",
  "Islam wedding", "Islamic wedding", "Nikkah wedding ceremony", "Pakistani marriage",
  "Pakistani wedding", "Pakistani Muslim wedding", "Shaadi London", "Shaadi in London",
  "Rishta in London", "London Rishta", "Nikkah London", "Islamic marriage site",
  "Halal marriage", "Halal marriage site", "Halal marriage site UK", "Halal marriage site London",
  "Muslim arranged marriage", "Interfaith Muslim marriage", "Muslim Nikkah", "Halal wedding",
  "Online Muslim marriage", "Bengali Muslim wedding", "Bengali wedding", "Pakistani couple",
  "Muslim couple", "Sunni Muslim marriage", "Sunni Muslim wedding", "Best Muslim marriage site",
  "Best Muslim marriage online", "Muslim marriage services", "Muslim marriage service", "Islam love marriage",
  "Muslim love marriage", "Sunnah marriage", "Sunnah wedding", "Nikkah sunnah",
  "Muslim shaadi", "Muslim shadi", "Pakistani shadi London", "Pakistani shaadi",
  "Muslima marriage", "Muslima marriage site", "Muslim matchmaking", "Muslim matchmaking site",
  "Halal Muslim marriage", "Muslim marriage group", "Muslim marriage matchmaking", "Single Muslim",
  "Young Muslim", "Indian Muslim", "Indian Muslim marriage", "Indian Muslim wedding",
  "Arab Muslim", "Arab Muslim wedding", "Arab Muslim marriage", "Pakistani nikkah",
  "Online rishta service", "Online Muslim rishta service", "Nikkah match", "Nikkah match UK",
  "Halal matchmaking UK", "Muslim marriage service UK", "Muslim rishta London", "Muslim rishta Leicester",
  "Muslim matrimonial", "Muslim matrimonial UK", "Muslim divorcee marriage", "Muslim matrimonial forum UK",
  "Muslim marriage Manchester", "Muslim rishta Manchester", "Muslim marriage service UK", "Muslim marriage service London",
  "Muslim rishta service London", "Pakistani Muslim", "Pakistani wedding London", "Pakistani shaadi Leicester",
  "Verified Muslim profiles", "Muslim marriage blog", "Muslim marriage Birmingham", "Muslim shaadi Birmingham",
  "Birmingham shaadi", "Muslim marriage platform", "Muslim marriage advice", "Muslim wife UK",
  "Muslim husband UK", "Pakistani wife UK", "Pakistani wife London", "Pakistani husband UK",
  "Muslim spouse", "Muslim spouse search", "Find muslim spouse", "Find Halal Partner London"
];

module.exports = {
  muslimMaleNames,
  muslimFemaleNames,
  seoKeywords
};