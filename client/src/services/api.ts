import axios from "axios";

// Get the base URL from environment if available, otherwise use default
// const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";
//const isProduction = window.location.hostname !== 'localhost';
//const baseURL = isProduction ? '' : "http://localhost:3000";

const baseURL = window.location.origin;

console.log(`API is configured with base URL: ${baseURL}`);

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout to prevent hanging requests
  timeout: 15000,
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage for each request
    const token = localStorage.getItem("userToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common error scenarios
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle authentication errors
      if (error.response.status === 401) {
        console.warn("Authentication error detected");

        // If we're not already on the login page, we might want to redirect
        if (!window.location.pathname.includes("/login")) {
          console.log("Unauthorized access detected. Token may be invalid.");

          // Clear token if it exists
          if (localStorage.getItem("userToken")) {
            localStorage.removeItem("userToken");
            // Only reload if we're not already on the login page
            // window.location.href = '/login';
            // We'll let the components handle navigation instead of forcing a page reload
          }
        }
      }

      // Handle server errors with friendly messages
      if (error.response.status >= 500) {
        console.error("Server error:", error.response.data);
        error.message =
          "The server encountered an error. Please try again later.";
      }
    } else if (error.request) {
      // Network error or no response
      console.error("Network error - no response received:", error.request);
      error.message =
        "Cannot connect to the server. Please check your internet connection.";
    }

    return Promise.reject(error);
  }
);

export default api;
