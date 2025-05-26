document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = loginForm.querySelector('button[type="submit"]');

  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");

    // Scroll to the error message
    errorMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Function to hide error message
  function hideError() {
    errorMessage.textContent = "";
    errorMessage.classList.remove("show");
  }

  // Function to set loading state
  function setLoading(isLoading) {
    if (isLoading) {
      loginButton.classList.add("loading");
      loginButton.disabled = true;
    } else {
      loginButton.classList.remove("loading");
      loginButton.disabled = false;
    }
  }

  // Handle form submission
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError();

    // Basic validation
    if (!usernameInput.value.trim()) {
      showError("Please enter your username");
      return;
    }

    if (!passwordInput.value) {
      showError("Please enter your password");
      return;
    }

    // Set loading state
    setLoading(true);
    // Get form data
    const formData = {
      username: usernameInput.value.trim(),
      password: passwordInput.value,
      remember: document.getElementById("remember").checked,
    };

    // Send AJAX request
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
      credentials: "same-origin", // Include cookies for session
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        if (data.success && data.redirect) {
          window.location.href = data.redirect;
        } else if (data.error) {
          showError(data.error);
        }
      })
      .catch((error) => {
        setLoading(false);
        showError("username or password is incorrect");
        console.error("Login error:", error);
      });
  });

  // Remove error class when user starts typing
  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener("input", function () {
      this.closest(".input-with-icon").classList.remove("error");
      if (errorMessage.classList.contains("show")) {
        hideError();
      }
    });
  });
});
