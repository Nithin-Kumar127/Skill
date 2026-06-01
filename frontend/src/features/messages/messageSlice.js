import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  messages: [],
  unreadCount: 0,
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: "",
};

// API action to mark messages as read in the database
export const markMessagesAsRead = createAsyncThunk(
  "messages/markAsRead",
  async (gigId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`/api/messages/read`, { gigId }, config);
      return gigId; 
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to sync read status");
    }
  }
);

export const fetchGigMessages = createAsyncThunk(
  "messages/fetchHistory",
  async (gigId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`/api/messages/${gigId}`, config);
      
      let fetchedMessages = [];
      if (response.data && Array.isArray(response.data.messages)) {
        fetchedMessages = response.data.messages;
      } else if (Array.isArray(response.data)) {
        fetchedMessages = response.data;
      }

      // Extract the current user ID directly from the auth state
      const authState = thunkAPI.getState().auth;
      const currentUser = authState.user?.user || authState.user;
      const currentUserId = currentUser?.id || currentUser?._id;

      return { messages: fetchedMessages, currentUserId };
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const messageSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    resetChatState: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
    // Instantly update local UI to "read" state for incoming messages
    markAsReadLocal: (state, action) => {
      const currentUserId = action.payload; 
      state.messages.forEach((msg) => {
        if (currentUserId && String(msg.sender?._id || msg.sender) !== String(currentUserId)) {
          msg.isRead = true;
        }
      });
      state.unreadCount = 0;
    },
    receiveSocketMessage: (state, action) => {
      if (!action.payload) return;
      if (!Array.isArray(state.messages)) state.messages = [];
      
      // Support incoming payload containing the message AND the current user context
      const msg = action.payload.message || action.payload;
      const incomingId = msg._id;
      const isMinimized = action.payload.isMinimized !== undefined ? action.payload.isMinimized : msg.isMinimized;
      const currentUserId = action.payload.currentUserId;

      if (!incomingId) return;

      const existingIndex = state.messages.findIndex(
        (m) => String(m._id).trim() === String(incomingId).trim()
      );

      if (existingIndex !== -1) {
        state.messages[existingIndex] = msg;
      } else {
        state.messages.push(msg);
        
        // ✅ CORRECTED LOGIC: Strictly check if message is UNREAD and NOT from the current user
        if (
          isMinimized && 
          !msg.isRead && 
          currentUserId && 
          String(msg.sender?._id || msg.sender) !== String(currentUserId)
        ) {
          state.unreadCount += 1;
        }
      }
    },
    clearUnreadCount: (state) => {
      state.unreadCount = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGigMessages.pending, (state) => { state.isLoading = true; })
      .addCase(fetchGigMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.messages = action.payload.messages;
        
        const userId = action.payload.currentUserId;
        
        // ✅ CORRECTED LOGIC: Filter array by strict 'unread' status (!m.isRead) AND exclude user's own sent messages
        if (userId) {
          state.unreadCount = state.messages.filter(
            (m) => m.isRead === false && String(m.sender?._id || m.sender) !== String(userId)
          ).length;
        } else {
          state.unreadCount = 0;
        }
      })
      .addCase(fetchGigMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.messages = [];
      })
      .addCase(markMessagesAsRead.fulfilled, (state) => {
        state.isSuccess = true;
      });
  },
});

export const { 
  resetChatState, 
  receiveSocketMessage, 
  clearUnreadCount, 
  markAsReadLocal 
} = messageSlice.actions;

export default messageSlice.reducer;