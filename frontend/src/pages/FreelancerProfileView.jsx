import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";
import { getFreelancerReviews } from "../features/reviews/reviewSlice";

export default function FreelancerProfileView() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { freelancerStats, reviews } = useSelector((state) => state.reviews) || {};

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [profile, setProfile] = useState({
    skills: [],
    portfolioGallery: [],
    resumeUrl: "",
    certifications: [],
    workExperience: [],
    availability: "open",
    hourlyRate: 0,
    maxPr: 0,
  });

  const [skillInput, setSkillInput] = useState({ name: "", proficiency: "intermediate" });
  const [certInput, setCertInput] = useState({ title: "", issuer: "", credentialUrl: "" });
  const [workInput, setWorkInput] = useState({ title: "", company: "", startDate: "", endDate: "", description: "" });

  // Isolate primitives so the useEffect doesn't constantly re-fire and wipe your typing!
  const userToken = user?.token;
  const userId = user?.id || user?.user?._id || user?._id;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${userToken}` } };
        const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
        
        const response = await axios.get(`${backendUrl}/api/profile/freelancer`, config);
        const dataPayload = response.data?.profile || response.data;
        
        if (dataPayload) {
          setProfile({
            skills: dataPayload.skills || [],
            portfolioGallery: dataPayload.portfolioGallery || [],
            resumeUrl: dataPayload.resumeUrl || "",
            certifications: dataPayload.certifications || [],
            workExperience: dataPayload.workExperience || [],
            availability: dataPayload.availability || "open",
            hourlyRate: dataPayload.hourlyRate || 0,
            maxPr: dataPayload.maxPr || 0,
          });
        }

        if (userId) {
          dispatch(getFreelancerReviews(userId));
        }

      } catch (error) {
        toast.error("Could not synchronize freelancer profile metrics.");
      } finally {
        setIsLoading(false);
      }
    };

    if (userToken) fetchProfileData();
    else setIsLoading(false);
    
  }, [userToken, userId, dispatch]);

  // --- ADD HANDLERS ---
  const handleAddSkill = () => {
    if (!skillInput.name.trim()) return;
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, { ...skillInput }] }));
    setSkillInput({ name: "", proficiency: "intermediate" });
  };

  const handleAddWork = () => {
    if (!workInput.title.trim() || !workInput.company.trim() || !workInput.startDate) return;
    setProfile((prev) => ({ ...prev, workExperience: [...prev.workExperience, { ...workInput }] }));
    setWorkInput({ title: "", company: "", startDate: "", endDate: "", description: "" });
  };

  // --- DELETE HANDLERS ---
  const handleRemoveSkill = (indexToRemove) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== indexToRemove) }));
  };

  const handleRemoveWork = (indexToRemove) => {
    setProfile((prev) => ({ ...prev, workExperience: prev.workExperience.filter((_, i) => i !== indexToRemove) }));
  };

  const handleRemovePortfolioImage = (indexToRemove) => {
    setProfile((prev) => ({ ...prev, portfolioGallery: prev.portfolioGallery.filter((_, i) => i !== indexToRemove) }));
  };

  const handleRemoveResume = () => {
    setProfile((prev) => ({ ...prev, resumeUrl: "" }));
  };

  // --- FILE UPLOAD HANDLER ---
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
      
      // Removed manual Content-Type so Axios can inject the secret Boundary!
      const config = {
        headers: { 
          Authorization: `Bearer ${userToken}`
        }
      };
      
      const response = await axios.post(`${backendUrl}/api/profile/upload`, formData, config);
      const newUrl = response.data.fileUrl;

      if (type === "resume") {
        setProfile((prev) => ({ ...prev, resumeUrl: newUrl }));
        toast.success("Resume uploaded successfully!");
      } else if (type === "portfolio") {
        setProfile((prev) => ({ ...prev, portfolioGallery: [...prev.portfolioGallery, newUrl] }));
        toast.success("Portfolio item added!");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("Failed to upload file. Check console for details.");
    } finally {
      setIsUploading(false);
      e.target.value = null; 
    }
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    const token = user?.token || localStorage.getItem("token");
    if (!token) return alert("Authentication Error: No token found. Please log in again.");

    try {
      const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(`${backendUrl}/api/profile/freelancer`, profile, config);
      
      alert("SUCCESS: Your profile has been updated and saved to the database!"); 
      toast.success("Professional profile records deployed!");
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to update profile";
      alert(`FAILED TO SAVE:\n\n${errorMsg}`);
      toast.error(`Error: ${errorMsg}`);
    }
  };

  if (isLoading) return <div className="min-h-[75vh] flex justify-center items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
      
      {/* 🌟 SMART REPUTATION & ANALYTICS DASHBOARD (Always Visible Now) */}
      <div className="mb-8 bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-8 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-300 mb-2">Verified Reputation</h2>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-black">
                {freelancerStats?.averageRating > 0 ? freelancerStats.averageRating.toFixed(1) : "0.0"}
              </span>
              <span className="text-xl text-blue-200 mb-1.5">/ 5.0</span>
            </div>
            <p className="mt-2 text-sm text-blue-100 font-medium">
              Based on <span className="font-bold text-white">{freelancerStats?.totalReviews || 0}</span> verified contracts.
            </p>
          </div>
          
          <div className="flex-1 w-full space-y-4 bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/20">
            {freelancerStats?.totalReviews > 0 ? (
              <>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-blue-100">Quality of Work</span><span>{freelancerStats.analytics?.quality?.toFixed(1) || "0.0"}</span></div>
                  <div className="w-full bg-blue-950 rounded-full h-2"><div className="bg-green-400 h-2 rounded-full" style={{ width: `${((freelancerStats.analytics?.quality || 0) / 5) * 100}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-blue-100">Communication</span><span>{freelancerStats.analytics?.communication?.toFixed(1) || "0.0"}</span></div>
                  <div className="w-full bg-blue-950 rounded-full h-2"><div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${((freelancerStats.analytics?.communication || 0) / 5) * 100}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-blue-100">Timeliness</span><span>{freelancerStats.analytics?.timeliness?.toFixed(1) || "0.0"}</span></div>
                  <div className="w-full bg-blue-950 rounded-full h-2"><div className="bg-blue-400 h-2 rounded-full" style={{ width: `${((freelancerStats.analytics?.timeliness || 0) / 5) * 100}%` }}></div></div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-blue-200 text-sm font-medium py-4 italic">
                Complete your first project to unlock analytics!
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitProfile} className="space-y-8">
        
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Freelancer Profile Workspace</h1>
            <p className="text-sm text-gray-500 mt-0.5">Build out your marketplace cards to verify your platform expertise.</p>
          </div>
          <button type="submit" className="bg-blue-600 px-5 py-3 text-sm font-semibold text-white rounded-xl shadow-md hover:bg-blue-700 transition cursor-pointer">
            Save Professional Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-400">💰 Financials & Resume</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                <input type="number" value={profile.hourlyRate} onChange={(e) => setProfile({ ...profile, hourlyRate: Number(e.target.value) })} className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Project Limit ($)</label>
                <input type="number" value={profile.maxPr} onChange={(e) => setProfile({ ...profile, maxPr: Number(e.target.value) })} className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Resume Document (PDF)</label>
              <div className="flex items-center gap-4 mt-2">
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, "resume")} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                {isUploading && <span className="text-xs text-blue-600 font-bold animate-pulse">Uploading...</span>}
              </div>
              
              {profile.resumeUrl && (
                <div className="mt-3 flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 w-fit">
                  <p className="text-xs text-green-600 font-semibold">✓ Resume attached</p>
                  <button type="button" onClick={handleRemoveResume} className="text-xs text-red-500 hover:text-red-700 font-bold px-2 border-l border-gray-300 cursor-pointer">Remove</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-400">📅 Availability status</h3>
            <select value={profile.availability} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none font-medium focus:border-blue-500 cursor-pointer">
              <option value="open">🟢 Open to Work</option>
              <option value="limited">🟡 Limited Bandwidth</option>
              <option value="unavailable">🔴 Fully Booked</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-400">🚀 Skills & Proficiency Levels</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <input type="text" value={skillInput.name} onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })} placeholder="e.g., React, Node.js" className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
            </div>
            <select value={skillInput.proficiency} onChange={(e) => setSkillInput({ ...skillInput, proficiency: e.target.value })} className="mt-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm cursor-pointer">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button type="button" onClick={handleAddSkill} className="bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl h-[42px] cursor-pointer">Add</button>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            {profile.skills.map((s, i) => (
              <span key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-100 pl-3 pr-1 py-1 rounded-xl text-xs font-bold text-blue-700">
                {s.name} ({s.proficiency})
                <button type="button" onClick={() => handleRemoveSkill(i)} className="text-blue-400 hover:text-red-500 text-lg leading-none p-1 rounded-full hover:bg-white transition cursor-pointer">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-400">🏢 Work Experience Timeline</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" value={workInput.title} onChange={(e) => setWorkInput({ ...workInput, title: e.target.value })} placeholder="Job Title" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
            <input type="text" value={workInput.company} onChange={(e) => setWorkInput({ ...workInput, company: e.target.value })} placeholder="Company Name" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">Start Date</label>
              <input type="date" value={workInput.startDate} onChange={(e) => setWorkInput({ ...workInput, startDate: e.target.value })} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">End Date (Leave blank if current)</label>
              <input type="date" value={workInput.endDate} onChange={(e) => setWorkInput({ ...workInput, endDate: e.target.value })} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm w-full" />
            </div>
            <textarea value={workInput.description} onChange={(e) => setWorkInput({ ...workInput, description: e.target.value })} placeholder="Briefly describe your responsibilities..." className="sm:col-span-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm w-full" rows="2" />
          </div>
          <button type="button" onClick={handleAddWork} className="w-full sm:w-auto bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl mt-2 cursor-pointer">Add Experience to Timeline</button>
          
          <div className="border-l-2 border-blue-100 pl-4 ml-2 mt-6 space-y-4">
            {profile.workExperience.map((work, index) => (
              <div key={index} className="relative bg-gray-50 border border-gray-100 p-4 rounded-xl">
                <div className="absolute -left-[23px] top-5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white"></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{work.title} at {work.company}</h4>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {new Date(work.startDate).toLocaleDateString()} - {work.endDate ? new Date(work.endDate).toLocaleDateString() : "Present"}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleRemoveWork(index)} className="text-red-500 hover:text-red-700 text-xs font-bold bg-white px-2 py-1 rounded border border-gray-200 shadow-sm transition cursor-pointer">Delete</button>
                </div>

                <p className="text-sm text-gray-600 mt-2">{work.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-400">🖼️ Portfolio Gallery Uploads</h3>
          <div className="flex items-center gap-4">
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "portfolio")} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {profile.portfolioGallery.map((imgUrl, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                <img src={`${backendUrl}${imgUrl}`} alt={`Portfolio item ${index}`} className="object-cover w-full h-full" />
                <button 
                  type="button" 
                  onClick={() => handleRemovePortfolioImage(index)} 
                  className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-sm shadow opacity-0 group-hover:opacity-100 transition hover:bg-red-700 cursor-pointer"
                  title="Delete Image"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

      </form>
    </div>
  );
}