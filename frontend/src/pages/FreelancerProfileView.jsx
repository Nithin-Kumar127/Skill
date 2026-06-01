import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";

export default function FreelancerProfileView() {
  const { user } = useSelector((state) => state.auth);
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

  // Local inputs state
  const [skillInput, setSkillInput] = useState({ name: "", proficiency: "intermediate" });
  const [certInput, setCertInput] = useState({ title: "", issuer: "", credentialUrl: "" });
  const [workInput, setWorkInput] = useState({ title: "", company: "", startDate: "", endDate: "", description: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user?.token}` } };
        const response = await axios.get("http://localhost:5000/api/profile/freelancer", config);
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
      } catch (error) {
        toast.error("Could not synchronize freelancer profile metrics.");
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.token) fetchProfile();
    else setIsLoading(false);
  }, [user]);

  // --- STANDARD HANDLERS ---
  const handleAddSkill = () => {
    if (!skillInput.name.trim()) return;
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, { ...skillInput }] }));
    setSkillInput({ name: "", proficiency: "intermediate" });
  };

  const handleAddCertification = () => {
    if (!certInput.title.trim()) return;
    setProfile((prev) => ({ ...prev, certifications: [...prev.certifications, { ...certInput }] }));
    setCertInput({ title: "", issuer: "", credentialUrl: "" });
  };

  const handleAddWork = () => {
    if (!workInput.title.trim() || !workInput.company.trim() || !workInput.startDate) return;
    setProfile((prev) => ({ ...prev, workExperience: [...prev.workExperience, { ...workInput }] }));
    setWorkInput({ title: "", company: "", startDate: "", endDate: "", description: "" });
  };

  // --- FILE UPLOAD HANDLER ---
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const config = {
        headers: { 
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "multipart/form-data" 
        }
      };
      
      const response = await axios.post("http://localhost:5000/api/profile/upload", formData, config);
      const newUrl = response.data.fileUrl;

      if (type === "resume") {
        setProfile((prev) => ({ ...prev, resumeUrl: newUrl }));
        toast.success("Resume uploaded successfully!");
      } else if (type === "portfolio") {
        setProfile((prev) => ({ ...prev, portfolioGallery: [...prev.portfolioGallery, newUrl] }));
        toast.success("Portfolio item added!");
      }
    } catch (error) {
      toast.error("Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      await axios.put("http://localhost:5000/api/profile/freelancer", profile, config);
      toast.success("Professional profile records deployed!");
    } catch (error) {
      toast.error("Failed to update profile details.");
    }
  };

  if (isLoading) return <div className="min-h-[75vh] flex justify-center items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
      <form onSubmit={handleSubmitProfile} className="space-y-8">
        
        {/* HEADER CONTROL MODULE */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Freelancer Profile Workspace</h1>
            <p className="text-sm text-gray-500 mt-0.5">Build out your marketplace cards to verify your platform expertise.</p>
          </div>
          <button type="submit" className="bg-blue-600 px-5 py-3 text-sm font-semibold text-white rounded-xl shadow-md hover:bg-blue-700 transition">
            Save Professional Profile
          </button>
        </div>

        {/* FINANCIALS, AVAILABILITY & RESUME */}
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
              {profile.resumeUrl && <p className="text-xs mt-2 text-green-600 font-semibold">✓ Resume currently on file</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-400">📅 Availability status</h3>
            <select value={profile.availability} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none font-medium focus:border-blue-500">
              <option value="open">🟢 Open to Work</option>
              <option value="limited">🟡 Limited Bandwidth</option>
              <option value="unavailable">🔴 Fully Booked</option>
            </select>
          </div>
        </div>

        {/* SKILLS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-400">🚀 Skills & Proficiency Levels</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <input type="text" value={skillInput.name} onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })} placeholder="e.g., React, Node.js" className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm" />
            </div>
            <select value={skillInput.proficiency} onChange={(e) => setSkillInput({ ...skillInput, proficiency: e.target.value })} className="mt-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button type="button" onClick={handleAddSkill} className="bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl h-[42px]">Add</button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {profile.skills.map((s, i) => (
              <span key={i} className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700">{s.name} ({s.proficiency})</span>
            ))}
          </div>
        </div>

        {/* WORK EXPERIENCE TIMELINE */}
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
          <button type="button" onClick={handleAddWork} className="w-full sm:w-auto bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl mt-2">Add Experience to Timeline</button>
          
          <div className="border-l-2 border-blue-100 pl-4 ml-2 mt-6 space-y-4">
            {profile.workExperience.map((work, index) => (
              <div key={index} className="relative">
                <div className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white"></div>
                <h4 className="font-bold text-gray-900 text-sm">{work.title} at {work.company}</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {new Date(work.startDate).toLocaleDateString()} - {work.endDate ? new Date(work.endDate).toLocaleDateString() : "Present"}
                </p>
                <p className="text-sm text-gray-600 mt-1">{work.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PORTFOLIO UPLOADS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase text-gray-400">🖼️ Portfolio Gallery Uploads</h3>
          <div className="flex items-center gap-4">
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "portfolio")} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {profile.portfolioGallery.map((imgUrl, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={`http://localhost:5000${imgUrl}`} alt={`Portfolio item ${index}`} className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        </div>

      </form>
    </div>
  );
}