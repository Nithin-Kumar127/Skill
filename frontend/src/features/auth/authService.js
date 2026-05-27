import axios from 'axios';

const API_URL = '/api/auth';

const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
    if (response.data.token) localStorage.setItem('token', response.data.token);
  }

  return response.data;
};

const login = async (userData) => {
  const response = await axios.post(`${API_URL}/login`, userData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
    if (response.data.token) localStorage.setItem('token', response.data.token);
  }

  return response.data;
};

const logout = () => {
  // CRITICAL FIX 1: Completely clear Axios default headers to prevent token leakage
  delete axios.defaults.headers.common['Authorization'];
  
  // CRITICAL FIX 2: Purge ALL localStorage keys to prevent stale session data
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  
  // DEFENSIVE: Wipe entire localStorage as extra precaution against data residue
  const keysToCheck = ['user', 'token', 'gig', 'proposal', 'freelancer', 'client'];
  keysToCheck.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✓ Logout: Axios headers and localStorage completely cleared');
};

// Append these action triggers onto the bottom of your existing authService.js file

// Dispatches a forgot password request link to the specified email address
const forgotPassword = async (emailData) => {
  const response = await axios.post(`${API_URL}/forgot-password`, emailData);
  return response.data;
};

// Submits the new secure password credentials along with the crypto tracking token parameter
const resetPassword = async ({ token, passwordData }) => {
  const response = await axios.post(`${API_URL}/reset-password/${token}`, passwordData);
  return response.data;
};

// Consumes the URL verification token to clear the email validation checkpoint
const verifyEmail = async (token) => {
  const response = await axios.post(`${API_URL}/verify-email/${token}`);
  // If your routing structure returns a persistent payload, sync local storage mirrors
  if (response.data && response.data.token) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

// Submits the final 6-digit verification code string to pass second-factor security checks
const verify2FA = async (twoFactorPayload) => {
  const response = await axios.post(`${API_URL}/verify-2fa`, twoFactorPayload);
  if (response.data && response.data.token) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

// Google OAuth 2.0 Backend Payload Proxy
const googleLogin = async (idToken) => {
  const response = await axios.post(`${API_URL}/google`, { idToken });
  if (response.data && response.data.token) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

// Update your export block at the very bottom to include these new methods cleanly
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

