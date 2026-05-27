import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Overview({ setActiveTab }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [metrics, setMetrics] = useState({ activeJobsCount: 0, totalEarnings: 0 });
  const [clientStats, setClientStats] = useState({ totalPosted: 0, openGigs: 0, inProgressGigs: 0 });
  const [liveStatus, setLiveStatus] = useState("unapplied");
  const [loading, setLoading] = useState(true);

  // Safeguard role extraction logic to parse any multi-tier user configurations
  const currentUser = user?.user?.user || user?.user || user;
  const role = currentUser?.role || "freelancer";
  const verificationStatus = liveStatus || currentUser?.verificationStatus || "unapplied";

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        if (role === "client") {
          // Client context calculates metrics from their own direct gigs pool
          const response = await axios.get(`${BASE_URL}/api/gigs`, config);
          const gigList = Array.isArray(response.data) ? response.data : response.data?.gigs || [];
          
          const openCount = gigList.filter(g => g.status === "open").length;
          const progressCount = gigList.filter(g => g.status === "in-progress" || g.status === "assigned").length;
          
          setClientStats({
            totalPosted: gigList.length,
            openGigs: openCount,
            inProgressGigs: progressCount
          });
        } else {
          // Freelancer context targets historical revenue tracking aggregates
          const response = await axios.get(`${BASE_URL}/api/proposals/my-metrics`, config);
          setMetrics({
            activeJobsCount: response.data?.activeJobsCount || 0,
            totalEarnings: response.data?.totalEarnings || 0,
          });
          setLiveStatus(response.data?.verificationStatus || "unapplied");
        }
      } catch (error) {
        console.error("Failed to sync dashboard metrics ledger:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardMetrics();
  }, [role]);

  // --- CLIENT VIEW RENDER LAYOUT ---
  if (role === "client") {
    return (
      <div className="w-full text-left space-y-6 animate-fadeIn">
        {/* OPERATIONAL SPECIFICATIONS STAT CARDS */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Posted Gigs</span>
            <p className="text-xl font-black text-gray-900 pt-0.5">{loading ? "..." : clientStats.totalPosted}</p>
          </div>
          
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Awaiting Assignment</span>
            <p className="text-xl font-black text-blue-600 pt-0.5">{loading ? "..." : clientStats.openGigs}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active In-Progress</span>
            <p className="text-xl font-black text-green-600 pt-0.5">{loading ? "..." : clientStats.inProgressGigs}</p>
          </div>
        </div>
      </div>
    );
  }

  // --- FREELANCER VIEW RENDER LAYOUT ---
  return (
    <div className="w-full text-left space-y-6 animate-fadeIn">
      {/* PERFORMANCE METRICS ANALYTICS BOXES */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Status</span>
          <div className="flex items-center gap-2 pt-1">
            <span className={`h-2 w-2 rounded-full ${verificationStatus === "verified" ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`}></span>
            <span className="text-sm font-bold text-gray-800 capitalize">{verificationStatus}</span>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Task Contracts</span>
          <p className="text-xl font-black text-gray-900 pt-0.5">{loading ? "..." : metrics.activeJobsCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Cleared Revenue</span>
          <p className="text-xl font-black text-green-600 pt-0.5">₹{loading ? "..." : metrics.totalEarnings}</p>
        </div>
      </div>

      {/* LOWER DATA BLOCK: RECENT ACTIVITY MONITORS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Current Job Matrix Assignments</h3>
        </div>
        
        {metrics.activeJobsCount === 0 ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-xs text-gray-400 italic">No active contracts are assigned to your production queue profile right now.</p>
            <button 
              onClick={() => navigate("/marketplace")}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              Find Open Gigs
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 text-xs text-blue-700">
            👋 You have ongoing development assignments. Click on the <strong>My Work</strong> sidebar option to verify progress logs.
          </div>
        )}
      </div>
    </div>
  );
}