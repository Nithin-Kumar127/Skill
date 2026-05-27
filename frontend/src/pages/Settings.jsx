import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Settings() {
  const { user } = useSelector((state) => state.auth);
  
  // Safe parsing to catch any shape of your Redux Auth User object
  const liveName = user?.name || user?.user?.name || user?.fullName || "Not Found";
  const liveEmail = user?.email || user?.user?.email || "Not Found";
  const liveRole = user?.role || user?.user?.role || "freelancer";

  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
  const [profileForm, setProfileForm] = useState({ phone: "", location: "Chennai" });
  const [msg, setMsg] = useState({ text: "", isError: false });
  const [updating, setUpdating] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword) return;
    
    setUpdating(true);
    setMsg({ text: "", isError: false });
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(`${BASE_URL}/api/profile/update-password`, passwordForm, config);
      setMsg({ text: "Security credentials updated successfully!", isError: false });
      setPasswordForm({ oldPassword: "", newPassword: "" });
    } catch (error) {
      setMsg({ text: error.response?.data?.message || "Failed to update credentials.", isError: true });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="w-full text-left space-y-6 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Account Settings</h2>
        <p className="text-xs text-gray-500 mt-1">Manage security authorization layers, credentials, and system core attributes.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* LEFT CARD: ACCOUNT METRICS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Profile Context</h3>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Registered Name</span>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{liveName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Email Endpoint</span>
              <p className="text-sm font-semibold text-gray-600 mt-0.5 break-all">{liveEmail}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Account Authority</span>
              <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 capitalize ring-1 ring-blue-100">
                {liveRole}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: SECURITY FORMS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <h3 className="text-sm font-bold text-gray-900">Rotate Credentials</h3>
            <p className="text-xs text-gray-400">Keep your account secure by rotating your login password tracking layers regularly.</p>
            
            {msg.text && (
              <div className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${msg.isError ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                {msg.isError ? "⚠️ " : "✅ "}{msg.text}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Current Password</label>
              <input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                className="w-full text-xs rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 transition shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">New Secure Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full text-xs rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 transition shadow-sm"
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:bg-gray-300 shadow-sm"
            >
              {updating ? "Saving Changes..." : "Update Credentials"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}