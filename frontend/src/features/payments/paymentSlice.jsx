import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  transactions: [], // 🌟 NEW: Holds the global transaction history
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: "",
};

// Create a Razorpay Order
export const createPaymentOrder = createAsyncThunk(
  "payments/createOrder",
  async (orderData, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      
      const response = await axios.post("/api/payments/create-order", orderData, config);
      return response.data; // Returns orderId, amount, currency, etc.
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Verify the payment signature received from the Razorpay modal
export const verifyPaymentSignature = createAsyncThunk(
  "payments/verifySignature",
  async (paymentDetails, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.post("/api/payments/verify", paymentDetails, config);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 🌟 NEW: Fetch Global Transaction History
export const fetchTransactionHistory = createAsyncThunk(
  "payments/fetchHistory",
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get("/api/payments/history", config);
      return response.data.transactions; 
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 🌟 NEW: Process a Refund (for Client or Admin)
export const processRefund = createAsyncThunk(
  "payments/processRefund",
  async (paymentId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.post("/api/payments/refund", { paymentId }, config);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const paymentSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    resetPaymentState: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createPaymentOrder.pending, (state) => { state.isLoading = true; })
      .addCase(createPaymentOrder.fulfilled, (state) => { state.isLoading = false; })
      .addCase(createPaymentOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Verify Signature
      .addCase(verifyPaymentSignature.pending, (state) => { state.isLoading = true; })
      .addCase(verifyPaymentSignature.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(verifyPaymentSignature.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // 🌟 Fetch Transaction History
      .addCase(fetchTransactionHistory.pending, (state) => { state.isLoading = true; })
      .addCase(fetchTransactionHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.transactions = action.payload; // Store the fetched transactions
      })
      .addCase(fetchTransactionHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.transactions = [];
      })

      // 🌟 Process Refund
      .addCase(processRefund.pending, (state) => { state.isLoading = true; })
      .addCase(processRefund.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(processRefund.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetPaymentState } = paymentSlice.actions;
export default paymentSlice.reducer;