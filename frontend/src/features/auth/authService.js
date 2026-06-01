import axios from "axios";

const API_URL = "/api/auth";

const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  if (response.data && response.data.token) {
    localStorage.setItem("user", JSON.stringify(response.data));
    localStorage.setItem("token", response.data.token); // 🌟 THE FIX: Save token independently
  }
  return response.data;
};

const login = async (userData) => {
  const response = await axios.post(`${API_URL}/login`, userData);

  // Only save if it's the final success (not the 2FA intercept)
  if (response.data && response.data.token) {
    localStorage.setItem("user", JSON.stringify(response.data));
    localStorage.setItem("token", response.data.token); // 🌟 THE FIX
  }
  
  return response.data;
};

const logout = async () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token"); // 🌟 THE FIX: Clean up on logout
};

const forgotPassword = async (emailData) => {
  const response = await axios.post(`${API_URL}/forgot-password`, emailData);
  return response.data;
};

const resetPassword = async ({ token, passwordData }) => {
  const response = await axios.post(`${API_URL}/reset-password/${token}`, passwordData);
  return response.data;
};

const verifyEmail = async (token) => {
  const response = await axios.get(`${API_URL}/verify-email/${token}`);
  return response.data;
};

const verify2FA = async (payload) => {
  const response = await axios.post(`${API_URL}/verify-2fa`, payload);
  
  if (response.data && response.data.token) {
    localStorage.setItem("user", JSON.stringify(response.data));
    localStorage.setItem("token", response.data.token); // 🌟 THE FIX
  }
  
  return response.data;
};

const googleLogin = async (idToken) => {
  const response = await axios.post(`${API_URL}/google`, { idToken });
  if (response.data && response.data.token) {
    localStorage.setItem("user", JSON.stringify(response.data));
    localStorage.setItem("token", response.data.token); // 🌟 THE FIX
  }
  return response.data;
};

const authService = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verify2FA,
  googleLogin,
};

export default authService;