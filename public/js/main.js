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
});
