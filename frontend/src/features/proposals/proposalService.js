import axios from "axios";

const API_URL = "/api/proposals";

const getUserProposals = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data;
};

const submitProposal = async (proposalData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  console.log("Calling URL:", API_URL, "with data:", proposalData);
  const response = await axios.post(API_URL, proposalData, config);
  return response.data;
};

const getUserProposalForGig = async (gigId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/my/${gigId}`, config);
  return response.data;
};
const updateProposal = async (proposalId, proposalData, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.patch(`${API_URL}/${proposalId}`, proposalData, config);
  return response.data;
};

const getGigProposals = async (gigId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/gig/${gigId}`, config);
  return response.data;
};

// Accept a proposal
const acceptProposal = async (proposalId, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  
  // FIXED: Changed endpoint mapping from axios.put to axios.patch to fit route updates
  const response = await axios.patch(`${API_URL}/${proposalId}/accept`, {}, config);
  
  return response.data;
};

const proposalService = {
  getUserProposals,
  submitProposal,
  getUserProposalForGig,
  getGigProposals,
  updateProposal,
  acceptProposal,
};

export default proposalService;