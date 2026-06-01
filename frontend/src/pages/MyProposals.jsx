import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { getUserProposals, reset } from "../features/proposals/proposalSlice";

export default function MyProposals() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { proposals, isLoading, isError, message } = useSelector(
    (state) => state.proposals,
  );

  const role = user?.role || user?.user?.role;

  useEffect(() => {
    dispatch(getUserProposals());
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  // Security Check: Only freelancers should track submitted bids
  if (role === "client") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-semibold">
          Clients can view incoming bids inside their created gigs.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            My Submitted Proposals
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track the evaluation status of your marketplace bids.
          </p>
        </div>
        <NavLink
          to="/dashboard"
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          &larr; Back to Dashboard
        </NavLink>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      ) : isError ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Could not load proposals: {message}
        </div>
      ) : proposals && proposals.length > 0 ? (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const targetGigId =
              proposal.gig?._id ||
              proposal.gig?.id ||
              (typeof proposal.gig === "string" ? proposal.gig : "");

            return (
              <div
                key={proposal._id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {proposal.gig?.title || "Project Application"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Bid Offered:{" "}
                      <span className="font-semibold text-green-600">
                        ${proposal.bidAmount}
                      </span>
                    </p>
                    <div className="mt-3 max-w-xl">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                        Cover Letter Draft
                      </span>
                      <p className="text-sm text-gray-600 italic line-clamp-2">
                        "{proposal.coverLetter}"
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 w-full sm:w-auto">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                        proposal.status === "accepted"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : proposal.status === "negotiating"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : proposal.status === "submitted"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : proposal.status === "completed"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : proposal.status === "rejected"
                                  ? "bg-gray-50 text-gray-600 border-gray-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {proposal.status}
                    </span>

                    {/* 🌟 FIX: Smart Routing logic */}
                    {(proposal.status === "accepted" ||
                      proposal.status === "submitted" ||
                      proposal.status === "completed" ||
                      proposal.status === "negotiating") &&
                      targetGigId && (
                        <button
                          onClick={() => {
                            // 🌟 UPDATED: Added "submitted" to the workspace routing condition
                            if (
                              ["accepted", "completed", "submitted"].includes(
                                proposal.status,
                              )
                            ) {
                              navigate(`/manage-gig/${targetGigId}`); // Go to workspace
                            } else {
                              navigate(`/gigs/${targetGigId}`); // Go to public gig page
                            }
                          }}
                          className={`rounded-lg px-4 py-2 text-xs font-bold shadow transition cursor-pointer outline-none whitespace-nowrap ${
                            proposal.status === "negotiating"
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {/* 🌟 UPDATED: Added "submitted" to the workspace text condition */}
                          {proposal.status === "completed"
                            ? "View Past Workspace →"
                            : ["accepted", "submitted"].includes(
                                  proposal.status,
                                )
                              ? "Enter Workspace →"
                              : proposal.status === "negotiating"
                                ? "Edit / Counter-Offer →"
                                : "View Gig Details →"}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-gray-500 font-medium">
            You haven't submitted any job proposals yet.
          </p>
          <NavLink
            to="/dashboard"
            className="text-blue-600 text-sm font-semibold underline mt-2 inline-block"
          >
            Browse active gigs
          </NavLink>
        </div>
      )}
    </div>
  );
}
