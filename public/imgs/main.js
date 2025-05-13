document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle
  const menuToggle = document.querySelector(".mobile-menu-toggle");
  const authButtons = document.querySelector(".auth-buttons");

  if (menuToggle && authButtons) {
    menuToggle.addEventListener("click", function () {
      authButtons.classList.toggle("active");
    });
  }

  // Close menu when clicking outside
  document.addEventListener("click", function (event) {
    if (
      !event.target.closest(".mobile-menu-toggle") &&
      !event.target.closest(".auth-buttons") &&
      authButtons &&
      authButtons.classList.contains("active")
    ) {
      authButtons.classList.remove("active");
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
