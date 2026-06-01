import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import authService from './authService';

const userFromStorageRaw = localStorage.getItem('user');
const userFromStorage = userFromStorageRaw ? JSON.parse(userFromStorageRaw) : null;

const initialState = {
  user: userFromStorage,
  requires2FA: false,      // Tracks if user is intercepted by a 2FA challenge
  temp2FAUserId: null,     // Holds temporary user reference for matching 2FA code submission
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Existing Thunks
export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
  try {
    return await authService.register(userData);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const login = createAsyncThunk('auth/login', async (userData, thunkAPI) => {
  try {
    return await authService.login(userData);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// --- NEW ASYNCHRONOUS THUNKS ---

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (emailData, thunkAPI) => {
  try {
    return await authService.forgotPassword(emailData);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ token, password }, thunkAPI) => {
  try {
    return await authService.resetPassword({ token, passwordData: { password } });
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (token, thunkAPI) => {
  try {
    return await authService.verifyEmail(token);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const verify2FA = createAsyncThunk('auth/verify2FA', async (payload, thunkAPI) => {
  try {
    return await authService.verify2FA(payload);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const googleLogin = createAsyncThunk('auth/googleLogin', async (idToken, thunkAPI) => {
  try {
    return await authService.googleLogin(idToken);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clear2FAState: (state) => {
      state.requires2FA = false;
      state.temp2FAUserId = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        // Intercept normal flow if backend explicitly flags that 2FA code is needed
        if (action.payload && action.payload.requires2FA) {
          state.requires2FA = true;
          state.temp2FAUserId = action.payload.userId;
          state.isSuccess = true; // Flag true so UI knows to switch views smoothly
        } else {
          state.isSuccess = true;
          state.user = action.payload;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.requires2FA = false;
        state.temp2FAUserId = null;
      })
      
      // --- NEW WORKFLOW REDUCER HANDLERS ---
      
      // Forgot Password Lifecycle
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload?.message || "Reset email dispatched successfully.";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Reset Password Lifecycle
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload?.message || "Password updated successfully.";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
    
      // 2FA Code Validation Lifecycle
      .addCase(verify2FA.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.requires2FA = false;
        state.temp2FAUserId = null;
        state.user = action.payload.user || action.payload;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Google Sign-In Lifecycle
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user || action.payload;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, clear2FAState } = authSlice.actions;
export default authSlice.reducer;