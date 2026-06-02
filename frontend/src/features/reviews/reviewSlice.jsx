import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  reviews: [],
  freelancerStats: null, // Holds averageRating, totalReviews, and analytics
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: "",
};

// Client submits a review
export const submitReview = createAsyncThunk(
  "reviews/submit",
  async (reviewData, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      
      const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
      const response = await axios.post(`${backendUrl}/api/reviews`, reviewData, config);
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Fetch a freelancer's reviews and analytics
export const getFreelancerReviews = createAsyncThunk(
  "reviews/getFreelancerReviews",
  async (freelancerId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      
      const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
      const response = await axios.get(`${backendUrl}/api/reviews/freelancer/${freelancerId}`, config);
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const reviewSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    resetReviewState: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit Review
      .addCase(submitReview.pending, (state) => { state.isLoading = true; })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get Reviews
      .addCase(getFreelancerReviews.pending, (state) => { state.isLoading = true; })
      .addCase(getFreelancerReviews.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.reviews = action.payload.reviews;
        state.freelancerStats = {
          averageRating: action.payload.averageRating,
          totalReviews: action.payload.totalReviews,
          analytics: action.payload.analytics,
        };
      })
      .addCase(getFreelancerReviews.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.reviews = [];
        state.freelancerStats = null;
      });
  },
});

export const { resetReviewState } = reviewSlice.actions;
export default reviewSlice.reducer;