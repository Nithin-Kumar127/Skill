import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import { getGigs, reset as resetGigs } from "../features/gigs/gigSlice";
import { acceptProposal, updateProposalStatus } from "../features/proposals/proposalSlice"; // 🌟 ADDED updateProposalStatus

export default function Proposals() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Extract gigs state robustly
  const gigsState = useSelector((state) => state.gigs);
  const rawGigs = gigsState?.gigs || [];
  const gigs = Array.isArray(rawGigs) ? rawGigs : rawGigs.gigs || [];
  const isLoading = gigsState?.isLoading || false;

  const role = user?.role || user?.user?.role;

  useEffect(() => {
    if (role === "client") {
      dispatch(getGigs());
    }
    return () => {
      if (role === "client") dispatch(resetGigs());
    };
  }, [dispatch, role]);

  // Extract and sort proposals
  const incomingBids = gigs.reduce((acc, gig) => {
    const proposals = Array.isArray(gig.proposals) ? gig.proposals : [];
    return acc.concat(
      proposals.map((bid) => ({
        ...bid,
        gig, 
      }))
    );
  }, []);

  const sortedBids = [...incomingBids].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Action Handler for Accepting a Proposal
  const handleAccept = async (proposalId) => {
    if (window.confirm("Are you sure you want to hire this freelancer? This will reject all other bids for this gig.")) {
      try {
        await dispatch(acceptProposal(proposalId)).unwrap();
        dispatch(getGigs());
      } catch (error) {
        alert("Failed to accept proposal: " + error);
      }
    }
  };

  // 🌟 NEW: Action Handler for Negotiate / Reject
  const handleStatusUpdate = async (proposalId, newStatus) => {
    if (window.confirm(`Are you sure you want to mark this proposal as ${newStatus}?`)) {
      try {
        await dispatch(updateProposalStatus({ proposalId, status: newStatus })).unwrap();
        dispatch(getGigs());
      } catch (error) {
        alert(`Failed to update proposal status: ${error}`);
      }
    }
  };

  // Security Check: Only clients should see this page
  if (role !== "client") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-semibold">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">All Proposals</h1>
          <p className="mt-2 text-sm text-gray-600">Review all bids submitted for your active gigs.</p>
        </div>
        <NavLink
          to="/dashboard"
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          ← Back to Dashboard
        </NavLink>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      ) : sortedBids.length > 0 ? (
        <div className="space-y-6">
          {sortedBids.map((proposal) => (
            <div
              key={proposal._id}
              className={`overflow-hidden rounded-2xl border transition-all ${
                proposal.status === 'rejected' ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {proposal.freelancer?.name || "Anonymous Freelancer"}
                    </h3>
                    <p className="text-sm font-medium text-gray-500">
                      Applying for: <span className="text-gray-700">{proposal.gig?.title}</span>
                    </p>
                  </div>
                  {/* 🌟 UPGRADED STATUS BADGES */}
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide border ${
                    proposal.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : 
                    proposal.status === 'rejected' ? 'bg-gray-100 text-gray-500 border-gray-200' : 
                    proposal.status === 'negotiating' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-yellow-50 text-yellow-800 border-yellow-200'
                  }`}>
                    {proposal.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 py-5">
                {/* 🌟 UPGRADED: Added Timeline Display */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center rounded bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700 ring-1 ring-inset ring-green-600/20">
                    Bid Amount: ${proposal.bidAmount}
                  </span>
                  {proposal.estimatedCompletionTime && (
                    <span className="inline-flex items-center rounded bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      Timeline: {proposal.estimatedCompletionTime}
                    </span>
                  )}
                </div>
                
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Cover Letter</h4>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 italic">"{proposal.coverLetter}"</p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <NavLink
                  to={`/manage-gig/${proposal.gig?._id}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition w-full sm:w-auto text-center"
                >
                  View Gig Details
                </NavLink>
                
                {/* 🌟 UPGRADED ACTION CONTROLS */}
                {(proposal.status === "pending" || proposal.status === "negotiating") && proposal.gig?.status === "open" ? (
                  <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto">
                    <button onClick={() => handleAccept(proposal._id)} className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition cursor-pointer shadow-sm">
                      Accept & Hire
                    </button>
                    <button onClick={() => handleStatusUpdate(proposal._id, 'negotiating')} className="px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-xl transition cursor-pointer">
                      Negotiate
                    </button>
                    <button onClick={() => handleStatusUpdate(proposal._id, 'rejected')} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-xl transition cursor-pointer">
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-gray-500 italic">
                    {proposal.gig?.status !== "open" ? `Gig is ${proposal.gig?.status}` : "No actions available"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-gray-500 font-medium">You haven't received any proposals yet.</p>
        </div>
      )}
    </div>
  );
}