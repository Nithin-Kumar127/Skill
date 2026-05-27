import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import axios from "axios";
import { fetchAllGigs, reset } from "../features/gigs/gigSlice";
import FreelancerApplyVerification from "./FreelancerApplyVerification";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Marketplace() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { allGigs, isLoading, isError, message } = useSelector(
    (state) => state.gigs,
  );

  // Fallback parsing variables for user properties
  const role = user?.role || user?.user?.role || "freelancer";
  
  // FIXED: Track verification status in local reactive state to respond immediately to updates
  const [liveVerificationStatus, setLiveVerificationStatus] = useState("unapplied");
  const [isSyncingStatus, setIsSyncingStatus] = useState(role === "freelancer");

  // Fetch the latest profile data from the server on mount to ensure status accuracy
  useEffect(() => {
    if (role !== "freelancer") {
      setIsSyncingStatus(false);
      return;
    }

    const syncVerificationStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${BASE_URL}/api/auth/me`, config);
        
        setLiveVerificationStatus(response.data?.verificationStatus || "unapplied");
      } catch (error) {
        console.error("Failed to sync live marketplace clearance validation:", error);
        // Fallback to static Redux token values if API call fails
        setLiveVerificationStatus(user?.verificationStatus || "unapplied");
      } finally {
        setIsSyncingStatus(false);
      }
    };

    syncVerificationStatus();
  }, [role, user]);

  // GATEKEEPER: Check local live state variable instead of static cached Redux prop
  const isUnverifiedFreelancer = role === "freelancer" && liveVerificationStatus !== "verified";

  useEffect(() => {
    // Only dispatch query fetch actions if the account clears security parameters
    if (!isSyncingStatus && !isUnverifiedFreelancer) {
      dispatch(fetchAllGigs());
    }

    return () => {
      dispatch(reset());
    };
  }, [dispatch, isUnverifiedFreelancer, isSyncingStatus]);

  // Render a clean loading indicator while confirming authorization status
  if (isSyncingStatus) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex h-96 w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // FIXED: If freelancer is not verified, bypass the red banner and render form states cleanly
  if (isUnverifiedFreelancer) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Child component now explicitly controls form UI state panels without double headers */}
        <FreelancerApplyVerification />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Marketplace
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Explore available gigs and find your next opportunity.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading gigs...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-600">{message || "Failed to load gigs."}</p>
          </div>
        ) : allGigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No gigs available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allGigs.map((gig) => (
              <div
                key={gig._id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {gig.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {gig.description}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-green-600">
                      Budget: ${gig.maxPr}
                    </span>
                    <span className="text-gray-500 capitalize">
                      {gig.status}
                    </span>
                  </div>
                  {gig.skillsRequired && gig.skillsRequired.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Skills:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gig.skillsRequired.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {gig.skillsRequired.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{gig.skillsRequired.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <NavLink
                  to={`/gigs/${gig._id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  View Details
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}