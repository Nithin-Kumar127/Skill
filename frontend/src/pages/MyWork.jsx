import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getGigs, getHiredGigs, reset } from "../features/gigs/gigSlice";

export default function MyWork() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  // Extract state matrices safely from your central slice
  const gigsState = useSelector((state) => state.gigs);
  const userGigs = gigsState?.gigs || []; 
  const hiredGigs = gigsState?.hiredGigs || [];
  const gigsLoading = gigsState?.isLoading || false;

  // Clear role extraction handles catching any multi-tier user configurations
  const currentUser = user?.user?.user || user?.user || user;
  const role = currentUser?.role || "freelancer";

  useEffect(() => {
    dispatch(reset());
    if (role === "client") {
      dispatch(getGigs());
    } else {
      dispatch(getHiredGigs());
    }
  }, [dispatch, role]);

  // Render client-specific workspace layout tracking logs
  if (role === "client") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6 text-left animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">My Posted Gigs</h2>
            <p className="text-xs text-gray-500 mt-1">Manage project descriptions, track proposals, and launch project deliverables.</p>
          </div>
          <button
            onClick={() => navigate("/create-gig")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition h-fit w-fit shrink-0 cursor-pointer"
          >
            + Post a New Gig
          </button>
        </div>

        <hr className="border-gray-100" />

        {gigsLoading ? (
          <div className="text-center text-xs text-gray-400 py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Syncing project listings portfolio...
          </div>
        ) : userGigs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl space-y-4">
            <p className="text-xs text-gray-400 italic">You have not published any gigs to the marketplace ecosystem yet.</p>
            <button
              onClick={() => navigate("/create-gig")}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              Publish Your First Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userGigs.map((gig) => (
              <div
                key={gig._id}
                onClick={() => navigate(`/manage-gig/${gig._id}`)}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 hover:shadow-md hover:border-blue-300 transition group cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition">
                      {gig.title}
                    </h4>
                    <span className="font-extrabold text-blue-600 text-sm shrink-0">₹{gig.maxPr}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{gig.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-100/70 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase">
                  <span className="text-gray-400">Category: <span className="text-gray-600 ml-0.5">{gig.category || "General"}</span></span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    gig.status === "open" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" :
                    gig.status === "in-progress" ? "bg-green-50 text-green-700 ring-1 ring-green-100" :
                    "bg-gray-50 text-gray-600 ring-1 ring-gray-100"
                  }`}>
                    ● {gig.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback layout context rendered perfectly for Freelancer access tracks
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6 text-left animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Project Workspace</h2>
        <p className="text-xs text-gray-500 mt-1">Monitor active job contracts and your submitted marketplace bids.</p>
      </div>

      <div className="flex border-b border-gray-100 text-xs">
        <button
          onClick={() => setLocalSubTab("active")}
          className="pb-2.5 font-bold border-b-2 px-1 text-blue-600 border-blue-600 outline-none"
        >
          Active Hires ({hiredGigs.length})
        </button>
      </div>

      {gigsLoading ? (
        <div className="text-center text-xs text-gray-400 py-12">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Syncing workspace tracking logs...
        </div>
      ) : hiredGigs.length === 0 ? (
        <div className="text-center text-xs text-gray-400 py-12 italic">
          No active contracts are assigned to your production queue profile right now.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hiredGigs.map((gig) => (
            <div 
              key={gig._id} 
              className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50/40 to-white p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-gray-900 text-sm truncate">{gig.title}</h4>
                  <span className="font-black text-green-600 shrink-0">₹{gig.maxPr}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{gig.description}</p>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-100/70">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800 capitalize">
                  ● {gig.status || "active"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}