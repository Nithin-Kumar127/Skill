import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import gigService from "./gigService";
import axios from "axios"; 

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const initialState = {
  gigs: [],
  allGigs: [],
  selectedGig: null,
  hiredGigs: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

export const createGig = createAsyncThunk(
  "gigs/create",
  async (gigData, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      return await gigService.createGig(gigData, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const getGigs = createAsyncThunk("gigs/getAll", async (_, thunkAPI) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    return await gigService.getGigs(token);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const fetchAllGigs = createAsyncThunk(
  "gigs/fetchAll",
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      return await gigService.getAllGigs(token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const fetchGigById = createAsyncThunk(
  "gigs/fetchById",
  async (gigId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      return await gigService.getGigById(gigId, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const getHiredGigs = createAsyncThunk(
  "gigs/getHired",
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      return await gigService.getHiredGigs(token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const submitMilestoneWork = createAsyncThunk(
  "gigs/submitMilestone",
  async ({ gigId, milestoneId, submissionData }, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      // FIXED BASE_URL PATH PREPEND CONTEXT INTEGRATIONS
      const response = await axios.post(
        `${BASE_URL}/api/gigs/${gigId}/milestones/${milestoneId}/submit`,
        submissionData,
        config
      );
      return response.data; 
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const approveMilestoneWork = createAsyncThunk(
  "gigs/approveMilestone",
  async ({ gigId, milestoneId }, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      // FIXED BASE_URL PATH PREPEND CONTEXT INTEGRATIONS
      const response = await axios.post(
        `${BASE_URL}/api/gigs/${gigId}/milestones/${milestoneId}/approve`,
        {},
        config
      );
      return response.data; 
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const gigSlice = createSlice({
  name: "gigs",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
      // CRITICAL FIX: Purge all cached gig and selection data on logout/reset to prevent multi-account data leakage
      state.gigs = [];
      state.allGigs = [];
      state.selectedGig = null;
      state.hiredGigs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createGig.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createGig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.gigs.push(action.payload.gig);
      })
      .addCase(createGig.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getGigs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getGigs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.gigs = Array.isArray(action.payload)
          ? action.payload
          : action.payload.gigs || [];
      })
      .addCase(getGigs.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(fetchAllGigs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllGigs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.allGigs = Array.isArray(action.payload)
          ? action.payload
          : action.payload.gigs || [];
      })
      .addCase(fetchAllGigs.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(fetchGigById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchGigById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedGig = action.payload.gig;
      })
      .addCase(fetchGigById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getHiredGigs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getHiredGigs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.hiredGigs = Array.isArray(action.payload.gigs)
          ? action.payload.gigs
          : [];
      })
      .addCase(getHiredGigs.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(submitMilestoneWork.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(submitMilestoneWork.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedGig = action.payload.gig; 
      })
      .addCase(submitMilestoneWork.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(approveMilestoneWork.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(approveMilestoneWork.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedGig = action.payload.gig; 
      })
      .addCase(approveMilestoneWork.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = gigSlice.actions;
export default gigSlice.reducer;