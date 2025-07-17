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

  // Inline editing
  document.querySelectorAll(".admin-edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const row = btn.closest("tr");
      if (row.classList.contains("editing")) return;
      row.classList.add("editing");
      btn.style.display = "none";

      // Store original values
      row._originalValues = {};
      row.querySelectorAll("td[data-field]").forEach((td) => {
        row._originalValues[td.dataset.field] = td.textContent.trim();
      });

      // Editable fields
      row.querySelectorAll("td[data-field]").forEach((td) => {
        const field = td.dataset.field;
        const value = td.textContent.trim();
        let input;
        if (field === "gender") {
          input = document.createElement("select");
          ["male", "female", "rather not say"].forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (opt === value.toLowerCase()) option.selected = true;
            input.appendChild(option);
          });
        } else if (field === "country") {
          input = document.createElement("select");
          ["Pakistan", "India", "UK"].forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            if (opt === value) option.selected = true;
            input.appendChild(option);
          });
        } else if (field === "religion") {
          input = document.createElement("select");
          [
            "islam",
            "hinduism",
            "christianity",
            "sikhism",
            "buddhism",
            "judaism",
            "other",
          ].forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (opt === value.toLowerCase()) option.selected = true;
            input.appendChild(option);
          });
        } else if (field === "caste") {
          input = document.createElement("select");
          [
            "syed",
            "sheikh",
            "pathan",
            "rajput",
            "mughal",
            "gujjar",
            "jutt",
            "ansari",
            "awwan",
            "qureshi",
            "malik",
            "choudhary",
            "other",
          ].forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (opt === value.toLowerCase()) option.selected = true;
            input.appendChild(option);
          });
        } else {
          input = document.createElement("input");
          input.type = field === "age" ? "number" : "text";
          input.value = value;
        }
        input.name = field;
        td.innerHTML = "";
        td.appendChild(input);
      });

      // Add Save/Cancel buttons
      const actionsTd = row.querySelector("td:last-child");
      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.className = "admin-save-btn";
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.className = "admin-cancel-btn";
      actionsTd.appendChild(saveBtn);
      actionsTd.appendChild(cancelBtn);

      // Save handler
      saveBtn.addEventListener("click", async function () {
        const userId = btn.dataset.userId;
        const data = {};
        row.querySelectorAll("td[data-field]").forEach((td) => {
          const input = td.querySelector("input,select");
          data[td.dataset.field] = input.value;
        });
        // Send update to server
        const res = await fetch(`/admin/user/${userId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          // Update row with new values
          row.querySelectorAll("td[data-field]").forEach((td) => {
            td.textContent = data[td.dataset.field];
          });
          row.classList.remove("editing");
          btn.style.display = "";
          saveBtn.remove();
          cancelBtn.remove();
        } else {
          alert("Failed to update user.");
        }
      });

      // Cancel handler
      cancelBtn.addEventListener("click", function () {
        row.querySelectorAll("td[data-field]").forEach((td) => {
          td.textContent = row._originalValues[td.dataset.field];
        });
        row.classList.remove("editing");
        btn.style.display = "";
        saveBtn.remove();
        cancelBtn.remove();
      });
    });
  });

  let userIdToDelete = null;
  let rowToDelete = null;

  const modal = document.getElementById("delete-modal");
  const modalCancel = document.getElementById("admin-modal-cancel");
  const modalOk = document.getElementById("admin-modal-ok");

  document.querySelectorAll("table .admin-delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      userIdToDelete = btn.dataset.userId;
      rowToDelete = btn.closest("tr");
      modal.style.display = "flex";
    });
  });

  modalCancel.addEventListener("click", function () {
    modal.style.display = "none";
    userIdToDelete = null;
    rowToDelete = null;
  });

  modalOk.addEventListener("click", function () {
    if (!userIdToDelete || !rowToDelete) return;
    fetch(`/admin/user/${userIdToDelete}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (res.ok) {
          rowToDelete.remove();
        } else {
          alert("Failed to delete user.");
        }
        modal.style.display = "none";
        userIdToDelete = null;
        rowToDelete = null;
      })
      .catch(() => {
        alert("Failed to delete user.");
        modal.style.display = "none";
        userIdToDelete = null;
        rowToDelete = null;
      });
  });

  // Hide modal when clicking outside the modal box
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.style.display = "none";
      userIdToDelete = null;
      rowToDelete = null;
    }
  });

  // Country/State/City data (reuse from your filter logic)
  const addCountry = document.getElementById("add-country");
  const addState = document.getElementById("add-state");
  const addCity = document.getElementById("add-city");

  function populateAddStates(country) {
    addState.innerHTML = '<option value="">State</option>';
    addState.disabled = !country;
    addCity.innerHTML = '<option value="">City</option>';
    addCity.disabled = true;
    if (countryStateCity[country]) {
      Object.keys(countryStateCity[country]).forEach((state) => {
        addState.innerHTML += `<option value="${state}">${state}</option>`;
      });
    }
  }
  function populateAddCities(country, state) {
    addCity.innerHTML = '<option value="">City</option>';
    addCity.disabled = !state;
    if (countryStateCity[country] && countryStateCity[country][state]) {
      countryStateCity[country][state].forEach((city) => {
        addCity.innerHTML += `<option value="${city}">${city}</option>`;
      });
    }
  }
  addCountry.addEventListener("change", function () {
    populateAddStates(this.value);
  });
  addState.addEventListener("change", function () {
    populateAddCities(addCountry.value, this.value);
  });

  // Modal logic
  const addUserModal = document.getElementById("add-user-modal");
  const addUserBtn = document.getElementById("admin-add-user-btn");
  const addUserCancel = document.getElementById("add-user-cancel");
  const addUserForm = document.getElementById("add-user-form");

  addUserBtn.addEventListener("click", function () {
    addUserModal.style.display = "flex";
  });
  addUserCancel.addEventListener("click", function () {
    addUserModal.style.display = "none";
    addUserForm.reset();
    addState.disabled = true;
    addCity.disabled = true;
  });
  addUserModal.addEventListener("click", function (e) {
    if (e.target === addUserModal) {
      addUserModal.style.display = "none";
      addUserForm.reset();
      addState.disabled = true;
      addCity.disabled = true;
    }
  });

  // Add user submit
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
          location.reload(); // Reload to show new user
        } else {
          alert(data.error || "Failed to add user.");
        }
      })
      .catch(() => alert("Failed to add user."));
  });

  // --- Admin user search bar logic ---
  const searchInput = document.getElementById("admin-user-search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const query = this.value.trim().toLowerCase();
      document
        .querySelectorAll(".admin-users-table tbody tr")
        .forEach((row) => {
          const username =
            row.children[1]?.textContent.trim().toLowerCase() || "";
          const name = row.children[2]?.textContent.trim().toLowerCase() || "";
          if (!query || username.includes(query) || name.includes(query)) {
            row.style.display = "";
          } else {
            row.style.display = "none";
          }
        });
    });
  }

  const genderSelect = document.getElementById("add-gender");
  const usernameInput = document.getElementById("add-username");

  genderSelect.addEventListener("change", async function () {
    const gender = this.value;
    if (!gender) {
      usernameInput.value = "";
      return;
    }
    // Fetch the current count from the server
    const res = await fetch(`/admin/usercount?gender=${gender}`);
    const data = await res.json();
    if (gender === "male") {
      usernameInput.value = `M${data.count + 1}`;
    } else if (gender === "female") {
      usernameInput.value = `F${data.count + 1}`;
    } else {
      usernameInput.value = `U${data.count + 1}`;
    }
  });

  // Disability field logic
  const disabilitySelect = document.querySelector('select[name="disability"]');
  const disabilityDetailInput = document.querySelector(
    'input[name="disabilityDetail"]'
  );

  function updateDisabilityDetail() {
    if (disabilitySelect.value === "yes") {
      disabilityDetailInput.readOnly = false;
      disabilityDetailInput.placeholder = "If yes, specify disability";
    } else {
      disabilityDetailInput.readOnly = true;
      disabilityDetailInput.value = "";
      disabilityDetailInput.placeholder = "If yes, specify disability";
    }
  }

  if (disabilitySelect && disabilityDetailInput) {
    updateDisabilityDetail();
    disabilitySelect.addEventListener("change", updateDisabilityDetail);
  }
});
