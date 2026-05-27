import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchGigById } from "../features/gigs/gigSlice";
import {
  submitProposal,
  getUserProposalForGig,
  reset,
} from "../features/proposals/proposalSlice";

export default function GigDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading: authLoading } = useSelector((state) => state.auth);
  const {
    gigs,
    selectedGig,
    isLoading: gigLoading,
    isError: gigError,
    message: gigMessage,
  } = useSelector((state) => state.gigs);
  const {
    isLoading: proposalLoading,
    isError: proposalError,
    message: proposalMessage,
    isSuccess,
    userProposal,
  } = useSelector((state) => state.proposals);

  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [localValidationError, setLocalValidationError] = useState("");

  // Target selectedGig or find in state array safely
  const gig = selectedGig || gigs.find((g) => g._id === id);

  // Normalize nested login user payload objects cleanly
  const currentUser = user?.user?.user || user?.user || user;
  const userRole = currentUser?.role;
  const userId = currentUser?.id || currentUser?._id; 

  const gigOwnerId =
    typeof gig?.user === "string" ? gig.user : gig?.user?._id || gig?.user?.id;

  const isFreelancer = userRole === "freelancer";
  const isOwnGig = userId?.toString() === gigOwnerId?.toString();
  
  // DEFENSIVE LAYER 1: Double-check that userProposal freelancer matches current user ID
  // If NOT matching, treat as if proposal doesn't exist (stale state protection)
  const hasApplied = 
    !!userProposal &&
    String(userProposal?.freelancer?._id || userProposal?.freelancer) === String(userId) &&
    String(userProposal?.gig) === String(id);

  // DEFENSIVE LAYER 2: Flag stale data for active monitoring
  const isStaleProposal = 
    !!userProposal && 
    String(userProposal?.freelancer?._id || userProposal?.freelancer) !== String(userId);

  useEffect(() => {
    console.log("GigDetails: User changed or component mounted", { userId, gigId: id, userProposal: userProposal?._id });
    
    // CRITICAL RESET: Immediately dispatch reset to clear ALL proposal state
    dispatch(reset());
    
    if (!gig) {
      dispatch(fetchGigById(id));
    }
    
    // Only fetch proposal if freelancer viewing someone else's gig
    if (isFreelancer && !isOwnGig && userId) {
      console.log("Fetching proposal status for freelancer", { userId, gigId: id });
      dispatch(getUserProposalForGig(id));
    }

    // CRITICAL CLEANUP: Return function absolutely must reset proposal state on unmount or dependency change
    return () => {
      console.log("GigDetails: Cleanup - resetting proposal state");
      dispatch(reset());
      // DEFENSIVE: Also set userProposal to null directly in state if possible
      // This is handled by reset() setting state.userProposal = null
    };
  }, [dispatch, id, isFreelancer, isOwnGig, userId]); // userId is CRITICAL dependency

  useEffect(() => {
    if (isSuccess) {
      console.log("Proposal submitted successfully - refreshing state");
      setCoverLetter("");
      setBidAmount("");
      setLocalValidationError("");
      dispatch(getUserProposalForGig(id));
    }
  }, [isSuccess, dispatch, id]);

  // DEFENSIVE LAYER 3: Actively monitor for stale proposal state and force correction
  useEffect(() => {
    if (isStaleProposal) {
      console.warn("🚨 STALE PROPOSAL DETECTED", { 
        storedFreelancer: String(userProposal?.freelancer?._id || userProposal?.freelancer),
        currentUser: String(userId),
        mismatch: true 
      });
      // Force complete reset and re-fetch with current user context
      dispatch(reset());
      if (isFreelancer && !isOwnGig && userId) {
        dispatch(getUserProposalForGig(id));
      }
    }
  }, [isStaleProposal, dispatch, id, isFreelancer, isOwnGig, userId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalValidationError("");

    if (!isFreelancer || isOwnGig) {
      setLocalValidationError("You are not authorized to submit a proposal for this gig.");
      return;
    }

    if (!coverLetter.trim() || !bidAmount) {
      setLocalValidationError("Please complete both form inputs to submit your proposal.");
      return;
    }

    const parsedBid = parseFloat(bidAmount);
    if (isNaN(parsedBid) || parsedBid <= 0) {
      setLocalValidationError("Please provide a valid numeric bid amount above zero.");
      return;
    }

    if (gig?.maxPr && parsedBid > gig.maxPr) {
      setLocalValidationError(`Your custom bid amount cannot exceed the client's upper budget threshold ceiling of ₹${gig.maxPr}.`);
      return;
    }

    const proposalData = {
      gig: id,
      coverLetter: coverLetter.trim(),
      bidAmount: parsedBid,
    };

    dispatch(submitProposal(proposalData));
  };

  if (authLoading || gigLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-500 font-medium">Syncing contract scope matrices...</span>
        </div>
      </div>
    );
  }

  if (gigError || !gig) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="text-center py-12 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <p className="text-sm font-semibold text-red-600">{gigMessage || "Contract assignment data node not found."}</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="mt-4 inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 text-left animate-fadeIn">
      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-br from-gray-50/50 to-white">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{gig.title}</h1>
          <div className="mt-3 flex items-center space-x-4 text-xs">
            <span className="inline-block rounded-xl bg-green-50 px-3 py-1 font-bold text-green-700 border border-green-100">
              Budget Maximum: ₹{gig.maxPr}
            </span>
            <span className="inline-block rounded-xl bg-blue-50 px-3 py-1 font-bold text-blue-700 border border-blue-100 capitalize">
              Pipeline Status: {gig.status}
            </span>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Project Specifications</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{gig.description}</p>
          </div>

          {gig.skillsRequired && gig.skillsRequired.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Target Stack Verification</h3>
              <div className="flex flex-wrap gap-1.5">
                {gig.skillsRequired.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-block bg-gray-100 text-gray-800 font-medium px-2.5 py-1 rounded-xl text-xs uppercase tracking-wide"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {currentUser && isFreelancer && !isOwnGig && (
          <div className="px-6 py-6 border-t border-gray-200 bg-gray-50/60">
            {hasApplied ? (
              <div className="text-center py-6 bg-white border border-green-100 rounded-xl max-w-md mx-auto shadow-sm space-y-1">
                <p className="text-green-600 font-bold text-sm">✓ Operational Proposal Transmitted</p>
                <p className="text-xs text-gray-500">Your profile bid ledger parameters are safely locked into this gig tracking index.</p>
              </div>
            ) : (
              <div className="max-w-2xl">
                <h3 className="text-base font-bold text-gray-900 mb-1">Apply for Contract Work Matrix</h3>
                <p className="text-xs text-gray-500 mb-4">Provide your structural cost configurations and engineering cover letter statement summary.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {(localValidationError || proposalError) && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      ⚠️ {localValidationError || proposalMessage}
                    </div>
                  )}

                  <div className="max-w-xs">
                    <label htmlFor="bidAmount" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Your Dynamic Bid Amount (₹)</label>
                    <input
                      type="number"
                      id="bidAmount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min="0"
                      step="1"
                      placeholder={`Max Budget Cap: ₹${gig.maxPr}`}
                      required
                      className="mt-1.5 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="coverLetter" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Professional Cover Letter Statement</label>
                    <textarea
                      id="coverLetter"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={5}
                      required
                      className="mt-1.5 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white leading-relaxed"
                      placeholder="Outline your expertise attributes, processing speed vectors, and milestone targets..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={proposalLoading}
                    className="inline-flex justify-center py-2.5 px-5 border border-transparent shadow-sm text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition cursor-pointer"
                  >
                    {proposalLoading ? "Transmitting Proposal Parameters..." : "Submit Platform Proposal Contract"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/20">
          <button
            onClick={() => navigate("/marketplace")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-xs font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            ← Return to Active Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}