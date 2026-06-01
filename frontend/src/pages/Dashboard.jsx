import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";

// Import Redux Actions
import {
  getGigs,
  getHiredGigs,
  reset as resetGigs,
} from "../features/gigs/gigSlice";
import {
  reset as resetProposals,
} from "../features/proposals/proposalSlice";

// Import Live Sub-page Components
import Overview from "./Overview";
import MyWork from "./MyWork";
import Settings from "./Settings";

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Active Tab state management tracking
  const [activeTab, setActiveTab] = useState("Overview");

  // Gigs State extraction
  const gigsState = useSelector((state) => state.gigs);
  const rawGigs = gigsState?.gigs || [];
  const gigs = Array.isArray(rawGigs) ? rawGigs : rawGigs.gigs || [];
  const gigsLoading = gigsState?.isLoading || false;

  // Hired Gigs for freelancers
  const hiredGigs = gigsState?.hiredGigs || [];

  // Identity state parse metrics
  const currentUser = user?.user?.user || user?.user || user;
  const name = currentUser?.name || currentUser?.fullName || currentUser?.email || "User";
  const role = currentUser?.role || "freelancer";

  useEffect(() => {
    if (role === "client") {
      dispatch(getGigs());
    } else if (role === "freelancer") {
      dispatch(getHiredGigs());
    }

    return () => {
      if (role === "client") dispatch(resetGigs());
      if (role === "freelancer") dispatch(resetProposals());
    };
  }, [role, dispatch]);

  const action =
    role === "client"
      ? { label: "Post a New Gig", to: "/create-gig", tone: "primary" }
      : role === "admin"
        ? { label: "View Admin Tools", to: "/admin", tone: "neutral" }
        : { label: "Explore Marketplace", to: "/marketplace", tone: "primary" };

  // --- PROPOSAL LOGIC ---
  const incomingBids = gigs.reduce((acc, gig) => {
    const proposals = Array.isArray(gig.proposals) ? gig.proposals : [];
    return acc.concat(proposals.map((bid) => ({
      ...bid,
      gig, 
    })));
  }, []);

  const sortedBids = [...incomingBids].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const proposalsToReview = sortedBids.slice(0, 3);

  // 🌟 UPDATED: Added "Transactions" link into the sidebar menu
  const menu = [
    { label: "Overview", type: "tab" },
    { label: role === "client" ? "My Gigs" : "My Work", type: "tab" },
    { label: "Transactions", type: "link", to: "/transactions" }, // <-- New Ledger Link
    { label: "Marketplace", type: "link", to: "/marketplace" },
    { label: role === "admin" ? "Admin" : "Settings", type: "tab" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 animate-fadeIn">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        
        {/* SIDEBAR NAVIGATION FRAME */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:self-start">
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-blue-50 to-white p-4 ring-1 ring-blue-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-sm">
              {String(name).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 text-left">{name}</p>
              <p className="mt-0.5 text-xs font-medium text-gray-600 text-left">
                Role:{" "}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200 capitalize">
                  {role}
                </span>
              </p>
            </div>
          </div>

          {/* DYNAMIC SIDEBAR INTERACTION LINK ELEMENT LOOPS */}
          <nav className="mt-4 space-y-1">
            {menu.map((item) => {
              if (item.type === "link") {
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-gray-400">›</span>
                  </NavLink>
                );
              }

              // Syncing dynamic display contexts inside standard tab mappings
              const tabIdentifier = item.label === "My Gigs" ? "My Work" : item.label;
              const isSelected = activeTab === tabIdentifier;

              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(tabIdentifier)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition text-left outline-none",
                    isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  <span className={`text-xs ${isSelected ? "text-blue-500 font-bold" : "text-gray-400"}`}>›</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ISOLATED COMPONENT CONTROLLER CONSOLE CONTAINER */}
        <main className="min-w-0 text-left">
          
          {/* TAB ROUTING RENDERING CONDITION CASES */}
          {activeTab === "Overview" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-900">
                      Welcome back, <span className="text-blue-600">{name}</span>
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      Here’s a quick snapshot of your activity and next steps.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    
                    {/* 🌟 UPDATED: Quick access Ledger Button */}
                    <button
                      onClick={() => navigate("/transactions")}
                      className="inline-flex items-center justify-center rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition shadow-sm border border-blue-200 cursor-pointer"
                    >
                      💳 Ledger
                    </button>
                    
                    <button
                      onClick={() => navigate(action.to)}
                      className={[
                        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 active:translate-y-px cursor-pointer",
                        action.tone === "primary"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus:ring-blue-200"
                          : "border border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50 focus:ring-blue-100",
                      ].join(" ")}
                    >
                      {action.label}
                    </button>
                  </div>
                </div>
              </div>

              {/* DYNAMIC DATA OVERVIEW CONSOLE STRIPS */}
              <Overview setActiveTab={setActiveTab} />

              {/* CLIENT WORKSPACE RECENT LOG CARDS (Rendered exclusively for Client convenience) */}
              {role === "client" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">Recent Gigs</h3>
                      <button onClick={() => setActiveTab("My Work")} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer outline-none">
                        View All →
                      </button>
                    </div>
                    
                    {gigsLoading ? (
                      <div className="flex items-center space-x-2 py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Loading gigs...</span>
                      </div>
                    ) : gigs.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {gigs.slice(0, 3).map((gig) => (
                          <NavLink
                            key={gig._id}
                            to={`/manage-gig/${gig._id}`}
                            className="group rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 hover:shadow-md hover:border-blue-300 transition-all block"
                          >
                            <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-900">{gig.title}</p>
                            <p className="mt-1 text-xs font-medium text-green-600">₹{gig.maxPr}</p>
                            <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 capitalize">
                              {gig.status}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-3">
                        <p className="text-xs text-gray-400 italic">No gigs posted yet.</p>
                        <button 
                          onClick={() => navigate("/create-gig")}
                          className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
                        >
                          Post a Gig
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Proposals to Review</h3>
                      <NavLink 
                        to="/proposals" 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer outline-none"
                      >
                        View All Proposals →
                      </NavLink>
                    </div>
                    {proposalsToReview.length > 0 ? (
                      <div className="space-y-4">
                        {proposalsToReview.map((proposal) => (
                          <NavLink
                            key={proposal._id}
                            to={`/manage-gig/${proposal.gig?._id}`}
                            className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:border-blue-300 hover:bg-white transition"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">{proposal.freelancer?.name || "Freelancer"}</p>
                                <p className="text-xs text-gray-500">Gig: {proposal.gig?.title}</p>
                              </div>
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-800 capitalize">
                                {proposal.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-bold text-green-700">Bid: ₹{proposal.bidAmount}</p>
                            <p className="mt-2 text-sm line-clamp-2 text-gray-700 italic">"{proposal.coverLetter}"</p>
                          </NavLink>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                        No proposals received yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "My Work" && <MyWork />}
          {activeTab === "Settings" && <Settings />}

        </main>
      </div>
    </div>
  );
}