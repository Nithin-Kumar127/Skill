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

export const fetchGigMessages = createAsyncThunk(
  "messages/fetchHistory",
  async (gigId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`/api/messages/${gigId}`, config);
      
      // FIXED DATA EXTRACTOR: Ensure we extract the raw array safely regardless of response shape
      if (response.data && Array.isArray(response.data.messages)) {
        return response.data.messages;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
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
    receiveSocketMessage: (state, action) => {
      if (!action.payload) return;
      
      // Defensively initialize array if it somehow mutates to a non-array type
      if (!Array.isArray(state.messages)) {
        state.messages = [];
      }

      // Check for a valid payload ID identifier field link
      const incomingId = action.payload._id;
      if (!incomingId) return;

      const existingIndex = state.messages.findIndex(
        (m) => String(m._id).trim() === String(incomingId).trim()
      );

      if (existingIndex !== -1) {
        state.messages[existingIndex] = action.payload;
      } else {
        state.messages.push(action.payload);
        if (action.payload.isMinimized) {
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
      .addCase(fetchGigMessages.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchGigMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // GUARANTEED SAFE ARRAY ASSIGNMENT: Prevents root object payload crashes completely
        state.messages = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchGigMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.messages = [];
      });
  },
});

export const { resetChatState, receiveSocketMessage, clearUnreadCount } = messageSlice.actions;
export default messageSlice.reducer;