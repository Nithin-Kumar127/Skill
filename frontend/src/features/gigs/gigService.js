import axios from "axios";

const API_URL = "/api/gigs/";

// Create new gig
const createGig = async (gigData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(API_URL, gigData, config);
  return response.data;
};

// Get user gigs
const getGigs = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data;
};

// Get all gigs for marketplace
const getAllGigs = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}all`, config);
  return response.data;
};

// Get single gig by ID
const getGigById = async (gigId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}${gigId}`, config);
  return response.data;
};

// Get hired gigs for freelancer
const getHiredGigs = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}hired`, config);
  return response.data;
};

const gigService = {
  createGig,
  getGigs,
  getAllGigs,
  getGigById,
  getHiredGigs,
};

export default gigService;
