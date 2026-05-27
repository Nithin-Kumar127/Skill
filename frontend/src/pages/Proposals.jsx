import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import { getGigs, reset as resetGigs } from "../features/gigs/gigSlice";
import { acceptProposal } from "../features/proposals/proposalSlice";

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
        // Trigger the backend update
        await dispatch(acceptProposal(proposalId)).unwrap();
        // Re-fetch the gigs to instantly update the UI with the fresh data from Atlas
        dispatch(getGigs());
      } catch (error) {
        alert("Failed to accept proposal: " + error);
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
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Card Header */}
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {proposal.freelancer?.name || "Anonymous Freelancer"}
                    </h3>
                    <p className="text-sm font-medium text-gray-500">
                      Applying for: <span className="text-gray-700">{proposal.gig?.title}</span>
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    proposal.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                    proposal.status === 'rejected' ? 'bg-gray-200 text-gray-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {proposal.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex items-center rounded bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700 ring-1 ring-inset ring-green-600/20">
                    Bid Amount: ${proposal.bidAmount}
                  </span>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Cover Letter</h4>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 italic">"{proposal.coverLetter}"</p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <NavLink
                  to={`/manage-gig/${proposal.gig?._id}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
                >
                  View Gig Details
                </NavLink>
                
                {/* Dynamic Accept Button */}
                <button 
                  onClick={() => handleAccept(proposal._id)}
                  disabled={proposal.status === 'accepted' || proposal.status === 'rejected'}
                  className={`rounded-lg px-6 py-2 text-sm font-bold text-white shadow-sm transition ${
                    proposal.status === 'accepted' 
                      ? 'bg-green-600 cursor-not-allowed'
                      : proposal.status === 'rejected'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {proposal.status === 'accepted' 
                    ? 'Hired' 
                    : proposal.status === 'rejected' 
                    ? 'Rejected' 
                    : 'Accept Proposal'}
                </button>
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