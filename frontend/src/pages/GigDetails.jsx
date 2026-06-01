import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchGigById } from "../features/gigs/gigSlice";
import {
  submitProposal,
  updateProposal,
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
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState("");
  const [localValidationError, setLocalValidationError] = useState("");

  const gig = selectedGig || gigs.find((g) => g._id === id);

  const currentUser = user?.user?.user || user?.user || user;
  const userRole = currentUser?.role;
  const userId = currentUser?.id || currentUser?._id; 

  const gigOwnerId = typeof gig?.user === "string" ? gig.user : gig?.user?._id || gig?.user?.id;
  const isFreelancer = userRole === "freelancer";
  const isOwnGig = userId?.toString() === gigOwnerId?.toString();
  
  const isNegotiating = userProposal?.status === "negotiating";

  const hasApplied = 
    !!userProposal &&
    String(userProposal?.freelancer?._id || userProposal?.freelancer) === String(userId) &&
    String(userProposal?.gig) === String(id) &&
    !isNegotiating; 

  const isStaleProposal = !!userProposal && String(userProposal?.freelancer?._id || userProposal?.freelancer) !== String(userId);

  useEffect(() => {
    dispatch(reset());
    if (!gig) {
      dispatch(fetchGigById(id));
    }
    if (isFreelancer && !isOwnGig && userId) {
      dispatch(getUserProposalForGig(id));
    }
    return () => {
      dispatch(reset());
    };
  }, [dispatch, id, isFreelancer, isOwnGig, userId]);

  useEffect(() => {
    if (isNegotiating && userProposal) {
      setBidAmount(userProposal.bidAmount || "");
      setEstimatedCompletionTime(userProposal.estimatedCompletionTime || "");
      setCoverLetter(userProposal.coverLetter || "");
    }
  }, [isNegotiating, userProposal]);

  useEffect(() => {
    if (isSuccess && !isNegotiating) {
      setCoverLetter("");
      setBidAmount("");
      setEstimatedCompletionTime("");
      setLocalValidationError("");
      dispatch(getUserProposalForGig(id));
    }
  }, [isSuccess, dispatch, id, isNegotiating]);

  useEffect(() => {
    if (isStaleProposal) {
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

    if (!coverLetter.trim() || !bidAmount || !estimatedCompletionTime.trim()) {
      setLocalValidationError("Please complete all form inputs to submit your proposal.");
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
      estimatedCompletionTime: estimatedCompletionTime.trim(),
    };

    if (isNegotiating) {
      dispatch(updateProposal({ proposalId: userProposal._id, proposalData }));
    } else {
      dispatch(submitProposal(proposalData));
    }
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
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-br from-gray-50/50 to-white">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{gig.title}</h1>
          <div className="mt-3 flex items-center space-x-4 text-xs">
            <span className="inline-block rounded-xl bg-green-50 px-3 py-1 font-bold text-green-700 border border-green-100">
              Budget Maximum: ₹{gig.maxPr}
            </span>
            {gig.category && (
              <span className="inline-block rounded-xl bg-purple-50 px-3 py-1 font-bold text-purple-700 border border-purple-100">
                {gig.category}
              </span>
            )}
            <span className="inline-block rounded-xl bg-blue-50 px-3 py-1 font-bold text-blue-700 border border-blue-100 capitalize">
              Status: {gig.status}
            </span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-6 space-y-8">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Project Specifications</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{gig.description}</p>
          </div>

          {gig.attachments && gig.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Attached Documents</h3>
              <div className="flex flex-wrap gap-2">
                {gig.attachments.map((url, i) => (
                  <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-gray-100 transition">
                    📎 View Document {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {gig.milestones && gig.milestones.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Project Milestones</h3>
              <ul className="space-y-2">
                {gig.milestones.map((m, i) => (
                  <li key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm">
                    <span className="font-semibold text-gray-800">{m.title}</span>
                    <span className="text-green-600 font-bold border border-green-200 bg-green-50 px-2.5 py-1 rounded-lg text-xs">₹{m.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gig.skillsRequired && gig.skillsRequired.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {gig.skillsRequired.map((skill, index) => (
                  <span key={index} className="inline-block bg-gray-100 text-gray-800 font-medium px-2.5 py-1 rounded-xl text-xs uppercase tracking-wide">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PROPOSAL APPLICATION FORM */}
        {currentUser && isFreelancer && !isOwnGig && (
          <div className="px-6 py-6 border-t border-gray-200 bg-gray-50/60">
            {hasApplied ? (
              // 🌟 FIX: Updated view to conditionally show "Workspace" link if accepted
              <div className="text-center py-8 bg-white border border-green-100 rounded-xl max-w-md mx-auto shadow-sm space-y-3">
                <p className="text-green-600 font-bold text-lg">
                  {userProposal?.status === "accepted" ? "🎉 Proposal Accepted!" : "✓ Operational Proposal Transmitted"}
                </p>
                <p className="text-sm text-gray-500">
                  {userProposal?.status === "accepted" 
                    ? "The client has hired you. You can now enter the workspace to collaborate." 
                    : "Your profile bid ledger parameters are safely locked into this gig tracking index."}
                </p>
                {userProposal?.status === "accepted" && (
                  <div className="pt-2">
                    <button
                      onClick={() => navigate(`/manage-gig/${id}`)}
                      className="inline-flex items-center px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md cursor-pointer"
                    >
                      Contract Started: Enter Workspace →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-2xl">
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isNegotiating ? "Negotiate Contract Terms" : "Apply for Contract Work Matrix"}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isNegotiating ? "The client has requested a counter-offer. Update your bid or timeline below." : "Provide your structural cost configurations and engineering cover letter statement summary."}
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(localValidationError || (proposalError && proposalMessage !== "No proposal found.")) && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      ⚠️ {localValidationError || proposalMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
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
                      <label htmlFor="estimatedCompletionTime" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Estimated Completion Time</label>
                      <input
                        type="text"
                        id="estimatedCompletionTime"
                        value={estimatedCompletionTime}
                        onChange={(e) => setEstimatedCompletionTime(e.target.value)}
                        placeholder="e.g., 2 weeks, 10 days"
                        required
                        className="mt-1.5 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
                      />
                    </div>
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
                    className={`inline-flex justify-center py-2.5 px-5 border border-transparent shadow-sm text-xs font-bold rounded-xl text-white ${
                      isNegotiating ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    } disabled:opacity-50 transition cursor-pointer`}
                  >
                    {proposalLoading ? "Processing..." : isNegotiating ? "Submit Counter-Offer" : "Submit Platform Proposal Contract"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* NAVIGATION FOOTER */}
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