import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  // CORE ADMINISTRATIVE STATE ARRAYS
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [pendingFreelancers, setPendingFreelancers] = useState([]);
  
  // UI INTERACTIVE UX STATE LAYOUTS
  const [activeTab, setActiveTab] = useState("metrics"); // Metrics, Verification, Disputes, Users
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState({});

  // 🌟 CONFIGURATION: Set base backend gateway target safely
  const API_BASE = "http://localhost:5000";

  // Fetch all administrative platform data segments
  const loadAdminDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Dispatch parallel REST requests directly to your adminRoutes endpoints
      const [statsRes, usersRes, disputesRes, pendingRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/stats`, config),
        axios.get(`${API_BASE}/api/admin/users`, config),
        axios.get(`${API_BASE}/api/admin/disputes`, config),
        axios.get(`${API_BASE}/api/admin/verification/pending`, config),
      ]);

      setStats(statsRes.data);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setDisputes(Array.isArray(disputesRes.data) ? disputesRes.data : []);
      setPendingFreelancers(pendingRes.data?.freelancers || []);
    } catch (error) {
      console.error("Failed to sync administration modules:", error);
      setErrorMessage(error.response?.data?.message || "Access denied. Administrative privileges required.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminDashboardData();
  }, []);

  // Handler to approve or reject a contractor's verification status
  const handleVerificationAction = async (userId, actionType) => {
    if (!window.confirm(`Are you sure you want to ${actionType} this freelancer profile application?`)) return;

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.patch(`${API_BASE}/api/admin/verification/${userId}`, { action: actionType }, config);
      alert(`Freelancer successfully ${actionType === "approve" ? "verified" : "rejected"}.`);
      
      // Hot-reload array pools locally without forcing a heavy page repaint
      setPendingFreelancers(prev => prev.filter(f => f._id !== userId));
      loadAdminDashboardData();
    } catch (error) {
      alert("Verification update failed: " + (error.response?.data?.message || error.message));
    }
  };

  // 🌟 ADDED: Handler to suspend or reinstate any platform profile instantly
  const handleToggleSuspension = async (userId, currentSuspensionStatus) => {
    const action = currentSuspensionStatus ? "unsuspend" : "suspend";
    if (!window.confirm(`Are you sure you want to ${action} this account user?`)) return;

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(`${API_BASE}/api/admin/users/${userId}/${action}`, {}, config);
      alert(`User profile execution successfully modified to: ${action}ed.`);
      loadAdminDashboardData(); // Refresh current table states
    } catch (error) {
      alert(`Suspension adjustment failed: ${error.response?.data?.message || error.message}`);
    }
  };

  // Handler to write logs and sign off ongoing contract disputes
  const handleResolveDispute = async (disputeId) => {
    const notes = resolutionNotes[disputeId]?.trim();
    if (!notes) {
      alert("Please provide official administrative review notes before resolving.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.patch(`${API_BASE}/api/admin/disputes/${disputeId}/resolve`, { adminNotes: notes }, config);
      alert("Dispute closed and resolved successfully.");
      
      setResolutionNotes(prev => ({ ...prev, [disputeId]: "" }));
      loadAdminDashboardData();
    } catch (error) {
      alert("Failed to resolve dispute context: " + (error.response?.data?.message || error.message));
    }
  };

  const handleNotesChange = (disputeId, value) => {
    setResolutionNotes(prev => ({ ...prev, [disputeId]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="rounded-2xl bg-red-50 p-6 border border-red-100">
          <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* PANEL TITLE */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Administration</h1>
          <p className="mt-1 text-sm text-gray-500">Manage platform metrics, review unverified freelancers, and settle escrow disputes.</p>
        </div>
        <button onClick={loadAdminDashboardData} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition">
          🔄 Refresh Audit Log
        </button>
      </div>

      {/* METRIC CARD OVERVIEWS ROW */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Global Registrations</p>
          <h3 className="mt-2 text-3xl font-black text-gray-900">{stats?.totalUsers || 0}</h3>
          <p className="mt-1 text-xs text-gray-400">Total active profiles</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Marketplace Contracts</p>
          <h3 className="mt-2 text-3xl font-black text-gray-900">{stats?.totalGigs || 0}</h3>
          <p className="mt-1 text-xs text-gray-400">Total job orders posted</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Platform Volume Gross</p>
          <h3 className="mt-2 text-3xl font-black text-green-600">₹{stats?.totalRevenue || 0}</h3>
          <p className="mt-1 text-xs text-gray-400">Escrow payments cleared</p>
        </div>
      </div>

      {/* NAVIGATION TABS SELECTORS BAR */}
      <div className="mb-6 flex border-b border-gray-200">
        {[
          { id: "metrics", label: "Overview Metrics" },
          { id: "verification", label: `Pending verification (${pendingFreelancers.length})` },
          { id: "disputes", label: `Escrow Disputes (${disputes.length})` },
          { id: "users", label: "User Directory" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition outline-none -mb-px ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-black"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT PANEL MODULES */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* TAB 1: METRICS ANALYTICS PANEL */}
        {activeTab === "metrics" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Platform Overview Trend Analysis</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your platform metrics are operating soundly. Use the tracking tab drawers above to review freelancer profile onboarding requests or settle disputes.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1">
              <p><strong>Database Target Server Status:</strong> Operational</p>
              <p><strong>WebSocket Synchronization Gateway:</strong> Connected on Port 5000</p>
            </div>
          </div>
        )}

        {/* TAB 2: FREELANCER APPROVAL LOOP CHECKLIST */}
        {activeTab === "verification" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Freelancer Identity Verification Pipeline</h2>
            {pendingFreelancers.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">No pending contractor profiles require validation auditing right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                      <th className="p-3">Full Candidate Name</th>
                      <th className="p-3">Email Workspace Address</th>
                      <th className="p-3">Account Creation Date</th>
                      <th className="p-3 text-right">Administrative Clearance Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingFreelancers.map((freelancer) => (
                      <tr key={freelancer._id} className="border-b hover:bg-gray-50/50 transition">
                        <td className="p-3 font-semibold text-gray-900">{freelancer.name}</td>
                        <td className="p-3 text-gray-600">{freelancer.email}</td>
                        <td className="p-3 text-gray-400">{new Date(freelancer.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => handleVerificationAction(freelancer._id, "approve")} className="rounded-lg bg-green-600 px-3 py-1.5 font-bold text-white shadow hover:bg-green-700 transition text-[11px]">Approve</button>
                          <button onClick={() => handleVerificationAction(freelancer._id, "reject")} className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white shadow hover:bg-red-700 transition text-[11px]">Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISPUTE MANAGEMENT */}
        {activeTab === "disputes" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Escrow Dispute Management</h2>
            {disputes.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">No active contract disputes filed in the ledger.</p>
            ) : (
              <div className="space-y-4">
                {disputes.map((dispute) => (
                  <div key={dispute._id} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${dispute.status === 'resolved' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {dispute.status}
                        </span>
                        <h4 className="font-bold text-gray-900 mt-1">Dispute Reference Link: {dispute._id}</h4>
                        <p className="text-xs text-gray-600 mt-1"><strong>Reason filed:</strong> "{dispute.reason}"</p>
                      </div>
                    </div>

                    {dispute.status === "open" && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                        <input
                          type="text"
                          placeholder="Provide administrative log notes..."
                          value={resolutionNotes[dispute._id] || ""}
                          onChange={(e) => handleNotesChange(dispute._id, e.target.value)}
                          className="flex-1 text-xs rounded-xl border border-gray-300 px-3 py-2 bg-white outline-none focus:border-blue-500"
                        />
                        <button onClick={() => handleResolveDispute(dispute._id)} className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow transition">
                          Resolve Dispute
                        </button>
                      </div>
                    )}
                    {dispute.status === "resolved" && dispute.adminNotes && (
                      <p className="text-xs text-purple-700 italic bg-purple-50 border border-purple-100 rounded-lg p-2 mt-2">
                        <strong>Resolution Note:</strong> "{dispute.adminNotes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PLATFORM USER DIRECTORY LIST */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Marketplace User Directory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="p-3">User Profile Identity</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Designated Role</th>
                    <th className="p-3">Verification Pipeline Status</th>
                    <th className="p-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item._id} className="border-b hover:bg-gray-50/50 transition">
                      <td className="p-3">
                        <span className="font-semibold text-gray-900">{item.name}</span>
                        {item.isSuspended && (
                          <span className="ml-2 text-[10px] font-bold tracking-tight text-red-600 uppercase bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Suspended</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">{item.email}</td>
                      <td className="p-3 font-medium uppercase text-gray-500 text-[10px] tracking-wide">{item.role}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 font-bold text-[10px] uppercase ${
                          item.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' :
                          item.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          item.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.verificationStatus || "unapplied"}
                        </span>
                      </td>
                      {/* 🌟 ADDED: Direct Suspend Account trigger panel row */}
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleToggleSuspension(item._id, item.isSuspended)} 
                          className={`rounded-lg px-2.5 py-1.5 font-bold transition text-[11px] border ${
                            item.isSuspended 
                              ? "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100" 
                              : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                          }`}
                        >
                          {item.isSuspended ? "Reactivate User" : "Suspend Account"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}