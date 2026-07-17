// Check if the app is running locally
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Dynamically assign the URL based on the environment
export const API_BASE_URL = isLocalhost 
  ? "http://localhost:8000" 
  : "https://amplify-backend-0xu5.onrender.com";