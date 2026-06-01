import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import proposalService from "./proposalService";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const initialState = {
  proposals: [],
  userProposal: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

export const getUserProposals = createAsyncThunk(
  "proposals/getUser",
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      return await proposalService.getUserProposals(token);
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

export const submitProposal = createAsyncThunk(
  "proposals/submit",
  async (proposalData, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      return await proposalService.submitProposal(proposalData, token);
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

// NEW THUNK: Freelancer submits a counter-offer
export const updateProposal = createAsyncThunk(
  "proposals/update",
  async ({ proposalId, proposalData }, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.patch(
        `${BASE_URL}/api/proposals/${proposalId}`,
        proposalData,
        config
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

export const getUserProposalForGig = createAsyncThunk(
  "proposals/getForGig",
  async (gigId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      return await proposalService.getUserProposalForGig(gigId, token);
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

export const getGigProposals = createAsyncThunk(
  "proposals/getGigProposals",
  async (gigId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      return await proposalService.getGigProposals(gigId, token);
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

export const acceptProposal = createAsyncThunk(
  "proposals/accept",
  async (proposalId, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      return await proposalService.acceptProposal(proposalId, token);
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

export const updateProposalStatus = createAsyncThunk(
  "proposals/updateStatus",
  async ({ proposalId, status }, thunkAPI) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.patch(
        `${BASE_URL}/api/proposals/${proposalId}/status`,
        { status },
        config
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue((error.response?.data?.message) || error.message || error.toString());
    }
  }
);

export const proposalSlice = createSlice({
  name: "proposals",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
      state.proposals = [];
      state.userProposal = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserProposals.pending, (state) => { state.isLoading = true; })
      .addCase(getUserProposals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.proposals = Array.isArray(action.payload) ? action.payload : action.payload.proposals || [];
      })
      .addCase(getUserProposals.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(submitProposal.pending, (state) => { state.isLoading = true; })
      .addCase(submitProposal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.proposals.push(action.payload.proposal);
        state.userProposal = action.payload.proposal;
      })
      .addCase(submitProposal.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateProposal.pending, (state) => { state.isLoading = true; })
      .addCase(updateProposal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.userProposal = action.payload.proposal;
        state.proposals = state.proposals.map(p => p._id === action.payload.proposal._id ? action.payload.proposal : p);
      })
      .addCase(updateProposal.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getUserProposalForGig.pending, (state) => { state.isLoading = true; })
      .addCase(getUserProposalForGig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.userProposal = action.payload.proposal;
      })
      .addCase(getUserProposalForGig.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.userProposal = null;
      })
      .addCase(getGigProposals.pending, (state) => { state.isLoading = true; })
      .addCase(getGigProposals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.proposals = Array.isArray(action.payload.proposals) ? action.payload.proposals : [];
      })
      .addCase(getGigProposals.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(acceptProposal.pending, (state) => { state.isLoading = true; })
      .addCase(acceptProposal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const acceptedProposalId = action.payload._id;
        state.proposals.forEach((p) => {
          p.status = p._id === acceptedProposalId ? "accepted" : "rejected";
        });
      })
      .addCase(acceptProposal.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateProposalStatus.pending, (state) => { state.isLoading = true; })
      .addCase(updateProposalStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const updatedProposal = action.payload.proposal;
        state.proposals = state.proposals.map((p) => p._id === updatedProposal._id ? updatedProposal : p);
      })
      .addCase(updateProposalStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = proposalSlice.actions;
export default proposalSlice.reducer;