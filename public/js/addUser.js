document.addEventListener("DOMContentLoaded", function () {
  // --- Country/State/City data ---
  const countryStateCity = {
    Pakistan: {
      Punjab: [
        "Lahore",
        "Faisalabad",
        "Rawalpindi",
        "Multan",
        "Gujranwala",
        "Sialkot",
        "Bahawalpur",
        "Sargodha",
        "Rahim Yar Khan",
        "Gujrat",
        "Sheikhupura",
        "Jhelum",
        "Kasur",
        "Okara",
        "Vehari",
        "Mandi Bahauddin",
        "Chiniot",
        "Toba Tek Singh",
        "Muzaffargarh",
        "Khanewal",
        "Dera Ghazi Khan",
        "Bahawalnagar",
        "Mianwali",
        "Pakpattan",
        "Lodhran",
        "Hafizabad",
        "Narowal",
        "Attock",
        "Sahiwal",
        "Other",
      ],
      Sindh: [
        "Karachi",
        "Hyderabad",
        "Sukkur",
        "Larkana",
        "Nawabshah",
        "Mirpur Khas",
        "Shikarpur",
        "Jacobabad",
        "Dadu",
        "Khairpur",
        "Ghotki",
        "Other",
      ],
      KPK: [
        "Peshawar",
        "Abbottabad",
        "Mardan",
        "Swat",
        "Kohat",
        "Bannu",
        "Dera Ismail Khan",
        "Charsadda",
        "Nowshera",
        "Mansehra",
        "Other",
      ],
      Balochistan: [
        "Quetta",
        "Turbat",
        "Gwadar",
        "Khuzdar",
        "Sibi",
        "Zhob",
        "Loralai",
        "Chaman",
        "Other",
      ],
      "Azad Kashmir": [
        "Muzaffarabad",
        "Mirpur",
        "Kotli",
        "Bagh",
        "Rawalakot",
        "Other",
      ],
    },
    India: {
      Maharashtra: ["Mumbai", "Pune", "Nagpur", "Other"],
      Delhi: ["New Delhi", "Other"],
      Punjab: ["Amritsar", "Ludhiana", "Other"],
      "Uttar Pradesh": ["Lucknow", "Kanpur", "Other"],
      "West Bengal": ["Kolkata", "Other"],
      Other: ["Other"],
    },
    UK: {
      England: [
        "London",
        "Manchester",
        "Birmingham",
        "Liverpool",
        "Leeds",
        "Sheffield",
        "Bristol",
        "Other",
      ],
      Scotland: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Other"],
      Wales: ["Cardiff", "Swansea", "Newport", "Other"],
      "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Other"],
    },
  };

  // --- Country/State/City dropdown logic for Add User page ---
  const addCountry = document.getElementById("add-country");
  const addState = document.getElementById("add-state");
  const addCity = document.getElementById("add-city");

  function populateAddStates(country) {
    addState.innerHTML =
      '<option value="">State</option><option value="N/A">N/A</option>';
    addState.disabled = !country || country === "N/A";
    addCity.innerHTML =
      '<option value="">City</option><option value="N/A">N/A</option>';
    addCity.disabled = true;
    if (countryStateCity[country]) {
      Object.keys(countryStateCity[country]).forEach((state) => {
        addState.innerHTML += `<option value="${state}">${state}</option>`;
      });
    }
  }
  function populateAddCities(country, state) {
    addCity.innerHTML =
      '<option value="">City</option><option value="N/A">N/A</option>';
    addCity.disabled = !state || state === "N/A";
    if (countryStateCity[country] && countryStateCity[country][state]) {
      countryStateCity[country][state].forEach((city) => {
        addCity.innerHTML += `<option value="${city}">${city}</option>`;
      });
    }
  }
  if (addCountry && addState && addCity) {
    addCountry.addEventListener("change", function () {
      populateAddStates(this.value);
    });
    addState.addEventListener("change", function () {
      populateAddCities(addCountry.value, this.value);
    });
  }

  // --- Children dynamic logic ---
  const hasChildrenSelect = document.getElementById("has-children");
  const childrenInputsDiv = document.getElementById("children-inputs");
  const addChildBtn = document.getElementById("add-child-btn");
  const childrenListDiv = document.getElementById("children-list");
  const childrenJsonInput = document.getElementById("children-json");
  let childrenArr = [];

  if (hasChildrenSelect) {
    hasChildrenSelect.addEventListener("change", function () {
      if (this.value === "yes") {
        childrenInputsDiv.style.display = "";
      } else {
        childrenInputsDiv.style.display = "none";
        childrenArr = [];
        childrenListDiv.innerHTML = "";
        childrenJsonInput.value = "[]";
      }
    });
  }

  if (addChildBtn) {
    addChildBtn.addEventListener("click", function () {
      const name = document.getElementById("child-name").value.trim();
      const age = parseInt(document.getElementById("child-age").value, 10);
      const livingLocation = document
        .getElementById("child-location")
        .value.trim();

      if (!name || isNaN(age) || !livingLocation) {
        alert("Please fill all child fields.");
        return;
      }

      childrenArr.push({ name, age, livingLocation });
      childrenJsonInput.value = JSON.stringify(childrenArr);

      renderChildrenList();

      document.getElementById("child-name").value = "";
      document.getElementById("child-age").value = "";
      document.getElementById("child-location").value = "";
    });
  }

  function renderChildrenList() {
    childrenListDiv.innerHTML = "";
    childrenArr.forEach((child, idx) => {
      const div = document.createElement("div");
      div.style.marginBottom = "4px";
      div.innerHTML = `
        <span>${child.name}, Age: ${child.age}, Location: ${child.livingLocation}</span>
        <button type="button" data-idx="${idx}" style="margin-left:8px;">Remove</button>
      `;
      div.querySelector("button").onclick = function () {
        childrenArr.splice(idx, 1);
        childrenJsonInput.value = JSON.stringify(childrenArr);
        renderChildrenList();
      };
      childrenListDiv.appendChild(div);
    });
  }

  // --- Education dynamic logic ---
  const hasEducationSelect = document.getElementById("has-education");
  const educationInputsDiv = document.getElementById("education-inputs");
  const addEducationBtn = document.getElementById("add-education-btn");
  const educationListDiv = document.getElementById("education-list");
  const educationJsonInput = document.getElementById("education-json");
  let educationArr = [];

  if (hasEducationSelect) {
    hasEducationSelect.addEventListener("change", function () {
      if (this.value === "yes") {
        educationInputsDiv.style.display = "";
      } else {
        educationInputsDiv.style.display = "none";
        educationArr = [];
        educationListDiv.innerHTML = "";
        educationJsonInput.value = "[]";
      }
    });
  }

  if (addEducationBtn) {
    addEducationBtn.addEventListener("click", function () {
      const title = document.getElementById("education-title").value.trim();
      const institute = document
        .getElementById("education-institute")
        .value.trim();
      const year = document.getElementById("education-year").value.trim();

      if (!title && !institute && !year) {
        alert("Please enter at least one education detail.");
        return;
      }

      educationArr.push({ title, institute, year });
      educationJsonInput.value = JSON.stringify(educationArr);
      renderEducationList();

      document.getElementById("education-title").value = "";
      document.getElementById("education-institute").value = "";
      document.getElementById("education-year").value = "";
    });
  }

  function renderEducationList() {
    educationListDiv.innerHTML = "";
    educationArr.forEach((edu, idx) => {
      const div = document.createElement("div");
      div.style.marginBottom = "4px";
      div.innerHTML = `
        <span>
          ${edu.title ? `<strong>${edu.title}</strong>` : ""}
          ${edu.institute ? `, ${edu.institute}` : ""}
          ${edu.year ? `, ${edu.year}` : ""}
        </span>
        <button type="button" data-idx="${idx}" style="margin-left:8px;">Remove</button>
      `;
      div.querySelector("button").onclick = function () {
        educationArr.splice(idx, 1);
        educationJsonInput.value = JSON.stringify(educationArr);
        renderEducationList();
      };
      educationListDiv.appendChild(div);
    });
  }

  // --- Auto-expand textareas ---
  [
    "aboutMe",
    "describeNature",
    "islamIsImportantToMeInfo",
    "QualitiesThatYouCanBringToYourMarriage",
    "lookingForASpouseThatIs",
    "anySpecialInformationPeopleShouldKnow",
  ].forEach(function (name) {
    const ta = document.querySelector('textarea[name="' + name + '"]');
    if (ta) {
      ta.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
      });
      ta.dispatchEvent(new Event("input"));
    }
  });

  // --- Username generation based on gender ---
  const genderSelect = document.getElementById("add-gender");
  const usernameInput = document.getElementById("add-username");
  if (genderSelect && usernameInput) {
    genderSelect.addEventListener("change", async function () {
      const gender = this.value;
      if (!gender || gender === "N/A") {
        usernameInput.value = "";
        return;
      }
      const res = await fetch(`/generate-username?gender=${gender}`);
      const data = await res.json();
      usernameInput.value = data.username || "";
    });
  }

  // --- Add user form submit ---
  const addUserForm = document.getElementById("add-user-form");
  if (addUserForm) {
    addUserForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(addUserForm).entries());
      fetch("/admin/user/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            window.location.href = "/admin/dashboard";
          } else {
            alert(data.error || "Failed to add user.");
          }
        })
        .catch(() => alert("Failed to add user."));
    });
  }
});
