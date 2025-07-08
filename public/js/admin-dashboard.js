document.addEventListener("DOMContentLoaded", function () {
  // Country/State/City data (from edit.ejs)
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

  // Dependent dropdowns for country/state/city
  const countrySelect = document.getElementById("filter-country");
  const stateSelect = document.getElementById("filter-state");
  const citySelect = document.getElementById("filter-city");

  function populateStates(country) {
    stateSelect.innerHTML = '<option value="">All</option>';
    stateSelect.disabled = !country;
    citySelect.innerHTML = '<option value="">All</option>';
    citySelect.disabled = true;
    if (countryStateCity[country]) {
      Object.keys(countryStateCity[country]).forEach((state) => {
        stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
      });
    }
  }
  function populateCities(country, state) {
    citySelect.innerHTML = '<option value="">All</option>';
    citySelect.disabled = !state;
    if (countryStateCity[country] && countryStateCity[country][state]) {
      countryStateCity[country][state].forEach((city) => {
        citySelect.innerHTML += `<option value="${city}">${city}</option>`;
      });
    }
  }
  countrySelect.addEventListener("change", function () {
    populateStates(this.value);
    filterTable();
  });
  stateSelect.addEventListener("change", function () {
    populateCities(countrySelect.value, this.value);
    filterTable();
  });
  citySelect.addEventListener("change", filterTable);

  // Other filters
  document
    .getElementById("filter-gender")
    .addEventListener("change", filterTable);
  document
    .getElementById("filter-religion")
    .addEventListener("change", filterTable);
  document
    .getElementById("filter-caste")
    .addEventListener("change", filterTable);

  // Table filter logic
  function filterTable() {
    const gender = document.getElementById("filter-gender").value;
    const country = countrySelect.value;
    const state = stateSelect.value;
    const city = citySelect.value;
    const religion = document.getElementById("filter-religion").value;
    const caste = document.getElementById("filter-caste").value;

    document.querySelectorAll(".admin-users-table tbody tr").forEach((row) => {
      let show = true;
      if (
        gender &&
        row.children[4].textContent.trim().toLowerCase() !==
          gender.toLowerCase()
      )
        show = false;
      if (country && row.children[5].textContent.trim() !== country)
        show = false;
      if (state && row.children[6].textContent.trim() !== state) show = false;
      if (city && row.children[7].textContent.trim() !== city) show = false;
      if (
        religion &&
        row.children[9].textContent.trim().toLowerCase() !==
          religion.toLowerCase()
      )
        show = false;
      if (
        caste &&
        row.children[10].textContent.trim().toLowerCase() !==
          caste.toLowerCase()
      )
        show = false;
      row.style.display = show ? "" : "none";
    });
  }
});
