document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle
  const menuToggle = document.querySelector(".mobile-menu-toggle");
  const authButtons = document.querySelector(".auth-buttons");

  if (menuToggle && authButtons) {
    menuToggle.addEventListener("click", function () {
      authButtons.classList.toggle("active");
    });
  }

  // Account dropdown toggle
  const accountDropdown = document.querySelector(".account-dropdown");
  const dropdownToggle = document.querySelector(".dropdown-toggle");

  if (accountDropdown && dropdownToggle) {
    dropdownToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      accountDropdown.classList.toggle("active");
    });
  }

  // Close dropdown and mobile menu when clicking outside
  document.addEventListener("click", function (event) {
    // Close mobile menu
    if (
      !event.target.closest(".mobile-menu-toggle") &&
      !event.target.closest(".auth-buttons") &&
      authButtons &&
      authButtons.classList.contains("active")
    ) {
      authButtons.classList.remove("active");
    }

    // Close account dropdown
    if (
      accountDropdown &&
      !event.target.closest(".account-dropdown") &&
      accountDropdown.classList.contains("active")
    ) {
      accountDropdown.classList.remove("active");
    }
  });

  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });

  // Profile Filter Functionality
  // Profile Filter Functionality
  const profileFilterForm = document.getElementById("profile-filter-form");
  const ageRangeMin = document.getElementById("age-range-min");
  const ageRangeMax = document.getElementById("age-range-max");
  const ageRangeMinValue = document.getElementById("age-min-value");
  const ageRangeMaxValue = document.getElementById("age-max-value");
  const filterToggle = document.querySelector(".filter-toggle");

  const filterContainer = document.querySelector(".filter-container");

  // Toggle filter visibility on mobile
  if (filterToggle && filterContainer) {
    filterToggle.addEventListener("click", function () {
      filterContainer.classList.toggle("active");

      // Change the icon and text based on state
      const icon = this.querySelector("i");
      const text = this.querySelector("span");

      if (filterContainer.classList.contains("active")) {
        icon.className = "fas fa-times";
        text.textContent = "Close Filters";
      } else {
        icon.className = "fas fa-filter";
        text.textContent = "Show Filters";
      }
    });
  }

  // Update age range display values
  if (ageRangeMin && ageRangeMinValue) {
    ageRangeMin.addEventListener("input", function () {
      ageRangeMinValue.textContent = this.value;

      // Ensure min doesn't exceed max
      if (parseInt(ageRangeMin.value) > parseInt(ageRangeMax.value)) {
        ageRangeMax.value = ageRangeMin.value;
        ageRangeMaxValue.textContent = ageRangeMax.value;
      }
    });
  }

  if (ageRangeMax && ageRangeMaxValue) {
    ageRangeMax.addEventListener("input", function () {
      ageRangeMaxValue.textContent = this.value;

      // Ensure max doesn't go below min
      if (parseInt(ageRangeMax.value) < parseInt(ageRangeMin.value)) {
        ageRangeMin.value = ageRangeMax.value;
        ageRangeMinValue.textContent = ageRangeMin.value;
      }
    });
  }

  // Handle filter form submission
  if (profileFilterForm) {
    profileFilterForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Get form data
      const formData = new FormData(profileFilterForm);

      // Convert to query string
      const queryParams = new URLSearchParams();

      for (const [key, value] of formData.entries()) {
        if (value) {
          // Only add non-empty values
          queryParams.append(key, value);
        }
      }

      // Redirect to profiles page with query string
      window.location.href = `/profiles?${queryParams.toString()}`;
    });

    // Handle reset button
    const resetButton = profileFilterForm.querySelector('button[type="reset"]');
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        // Reset the displayed values for age sliders
        if (ageRangeMinValue) ageRangeMinValue.textContent = "18";
        if (ageRangeMaxValue) ageRangeMaxValue.textContent = "60";

        // Wait for the form to reset then redirect to profiles without filters
        setTimeout(() => {
          window.location.href = "/profiles";
        }, 100);
      });
    }
  }

  // Layout switcher functionality
  const layoutButtons = document.querySelectorAll(".layout-btn");
  const profilesGrid = document.querySelector(".profiles-grid");

  if (layoutButtons.length > 0 && profilesGrid) {
    // Save user preference to localStorage
    const savedLayout = localStorage.getItem("profilesLayout");
    if (savedLayout) {
      changeLayout(savedLayout);

      // Update active button
      layoutButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.columns === savedLayout);
      });
    }

    layoutButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const columns = this.dataset.columns;

        // Don't do anything if already active
        if (this.classList.contains("active")) return;

        // Update active button
        layoutButtons.forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");

        // Change layout with animation
        changeLayout(columns);

        // Save preference
        localStorage.setItem("profilesLayout", columns);
      });
    });

    function changeLayout(columns) {
      // Add transition class for animation
      profilesGrid.classList.add("layout-transition");

      // Set current layout attribute for CSS
      profilesGrid.dataset.currentLayout = columns;

      // Remove transition class after animation completes
      setTimeout(() => {
        profilesGrid.classList.remove("layout-transition");
      }, 500);
    }
  }

  // Remove individual filter functionality
  document.querySelectorAll(".filter-remove").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const filter = btn.getAttribute("data-filter");
      const url = new URL(window.location.href);
      if (filter === "age") {
        url.searchParams.delete("minAge");
        url.searchParams.delete("maxAge");
      } else {
        url.searchParams.delete(filter);
      }
      // Remove empty params for clean URL
      window.location.href =
        url.pathname +
        (url.searchParams.toString() ? "?" + url.searchParams.toString() : "");
    });
  });
});
