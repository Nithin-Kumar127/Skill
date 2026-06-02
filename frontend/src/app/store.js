import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import gigReducer from "../features/gigs/gigSlice";
import proposalReducer from "../features/proposals/proposalSlice";
import messageReducer from "../features/messages/messageSlice";
import paymentReducer from "../features/payments/paymentSlice";
import reviewReducer from '../features/reviews/reviewSlice';
// ... add to configureStore:
// reviews: reviewReducer,

export const store = configureStore({
  reducer: {
    auth: authReducer,
    gigs: gigReducer,
    proposals: proposalReducer,
    messages: messageReducer,
    payments: paymentReducer,
    reviews: reviewReducer,
  },
});