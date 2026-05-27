import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";

export default function FreelancerProfileView() {
  const { user } = useSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  // Initializing state with fallbacks to match your exact schema fields
  const [profile, setProfile] = useState({
    skills: [],
    portfolioGallery: [],
    resumeUrl: "",
    certifications: [],
    availability: "open",
    hourlyRate: 0,
    maxPr: 0,
  });

  // Local inputs state
  const [skillInput, setSkillInput] = useState({ name: "", proficiency: "intermediate" });
  const [certInput, setCertInput] = useState({ title: "", issuer: "", credentialUrl: "" });
  const [portfolioInput, setPortfolioInput] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${user?.token}` },
        };
        
        // Hitting your profile endpoint
        const response = await axios.get("http://localhost:5000/api/profile/freelancer", config);
        
        // Extracting data safely from the backend wrap structure
        const dataPayload = response.data?.profile || response.data;
        
        if (dataPayload) {
          setProfile({
            skills: dataPayload.skills || [],
            portfolioGallery: dataPayload.portfolioGallery || [],
            resumeUrl: dataPayload.resumeUrl || "",
            certifications: dataPayload.certifications || [],
            availability: dataPayload.availability || "open",
            hourlyRate: dataPayload.hourlyRate || 0,
            maxPr: dataPayload.maxPr || 0,
          });
        }
      } catch (error) {
        console.error("❌ Profile fetch failure details:", error.response?.data || error.message);
        toast.error(error.response?.data?.message || "Could not synchronize freelancer profile metrics.");
      } finally {
        // 🌟 THE LIFESAVING FIX: Force the spinner off regardless of network errors or missing entries!
        setIsLoading(false);
      }
    };

    if (user?.token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleAddSkill = () => {
    if (!skillInput.name.trim()) return;
    setProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, { name: skillInput.name.trim(), proficiency: skillInput.proficiency }],
    }));
    setSkillInput({ name: "", proficiency: "intermediate" });
  };

  const handleAddCertification = () => {
    if (!certInput.title.trim()) return;
    setProfile((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { ...certInput }],
    }));
    setCertInput({ title: "", issuer: "", credentialUrl: "" });
  };

  const handleAddPortfolio = () => {
    if (!portfolioInput.trim()) return;
    setProfile((prev) => ({
      ...prev,
      portfolioGallery: [...prev.portfolioGallery, portfolioInput.trim()],
    }));
    setPortfolioInput("");
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
      };
      
      // Posting to your updated backend configuration
      const response = await axios.put("http://localhost:5000/api/profile/freelancer", profile, config);
      toast.success(response.data.message || "Professional profile records deployed!");
    } catch (error) {
      console.error("Submit profile error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update profile details.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-xs font-bold text-gray-400 tracking-wider uppercase animate-pulse">Hydrating profile metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
      <form onSubmit={handleSubmitProfile} className="space-y-8">
        
        {/* HEADER CONTROL MODULE */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Freelancer Profile Workspace</h1>
            <p className="text-sm text-gray-500 mt-0.5">Build out your marketplace cards to verify your platform expertise.</p>
          </div>
          <button
            type="submit"
            className="inline-flex justify-center items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition cursor-pointer outline-none"
          >
            Save Professional Profile
          </button>
        </div>

        {/* FINANCIALS & AVAILABILITY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">💰 Financial Metrics & Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Base Hourly Rate ($)</label>
                <input
                  type="number"
                  value={profile.hourlyRate}
                  onChange={(e) => setProfile({ ...profile, hourlyRate: Number(e.target.value) })}
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Project Limit / maxPr ($)</label>
                <input
                  type="number"
                  value={profile.maxPr}
                  onChange={(e) => setProfile({ ...profile, maxPr: Number(e.target.value) })}
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Resume Link URL</label>
              <input
                type="text"
                value={profile.resumeUrl || ""}
                onChange={(e) => setProfile({ ...profile, resumeUrl: e.target.value })}
                placeholder="https://drive.google.com/your-resume.pdf"
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">📅 Availability status</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marketplace Status</label>
              <select
                value={profile.availability}
                onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 font-medium"
              >
                <option value="open">🟢 Open to Work (open)</option>
                <option value="limited">🟡 Limited Bandwidth (limited)</option>
                <option value="unavailable">🔴 Fully Booked (unavailable)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SKILLS ACCRETION PANELS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">🚀 Skills & Proficiency Levels</h3>
          <div className="flex flex-col sm:flex-row items-end gap-3 max-w-2xl">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700">Skill Title</label>
              <input
                type="text"
                value={skillInput.name}
                onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })}
                placeholder="e.g., React, Node.js, C++"
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-gray-700">Proficiency Tier</label>
              <select
                value={skillInput.proficiency}
                onChange={(e) => setSkillInput({ ...skillInput, proficiency: e.target.value })}
                className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-medium"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddSkill}
              className="bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-800 transition cursor-pointer w-full sm:w-auto h-[46px]"
            >
              Add Skill
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {profile.skills.map((skill, index) => (
              <span key={index} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700">
                {skill.name} <span className="opacity-60 text-[10px] uppercase">({skill.proficiency})</span>
              </span>
            ))}
          </div>
        </div>

        {/* CERTIFICATIONS ARRAY VIEW */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">📜 Professional Certifications</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Certification Name</label>
              <input
                type="text"
                value={certInput.title}
                onChange={(e) => setCertInput({ ...certInput, title: e.target.value })}
                placeholder="AWS Certified Architect"
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Issuing Organization</label>
              <input
                type="text"
                value={certInput.issuer}
                onChange={(e) => setCertInput({ ...certInput, issuer: e.target.value })}
                placeholder="Amazon Web Services"
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Verification URL</label>
                <input
                  type="text"
                  value={certInput.credentialUrl}
                  onChange={(e) => setCertInput({ ...certInput, credentialUrl: e.target.value })}
                  placeholder="https://verify.com/id"
                  className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCertification}
                className="bg-gray-900 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-800 transition h-[46px] cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {profile.certifications.map((cert, index) => (
              <div key={index} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                <div>
                  <h4 className="font-bold text-gray-900">{cert.title}</h4>
                  <p className="text-xs text-gray-500">Issued by: {cert.issuer || "N/A"}</p>
                </div>
                {cert.credentialUrl && (
                  <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                    View Link →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PORTFOLIO ASSETS STRINGS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">🖼️ Portfolio Asset Links</h3>
          <div className="flex items-end gap-3 max-w-2xl">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Project Showcase Link URL</label>
              <input
                type="text"
                value={portfolioInput}
                onChange={(e) => setPortfolioInput(e.target.value)}
                placeholder="https://github.com/my-project-repo"
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPortfolio}
              className="bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-800 transition h-[46px] cursor-pointer"
            >
              Add Project
            </button>
          </div>

          <ul className="space-y-1.5 pt-2">
            {profile.portfolioGallery.map((link, index) => (
              <li key={index} className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-mono text-gray-600 truncate">
                🔗 {link}
              </li>
            ))}
          </ul>
        </div>

      </form>
    </div>
  );
}