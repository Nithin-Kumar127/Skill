import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { createGig, reset } from "../features/gigs/gigSlice";

const CreateGig = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isError, isLoading, message } = useSelector((state) => state.gigs);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    maxPr: "",
    category: "",
    estimatedDuration: "",
    skillsRequired: "",
  });
  
  const [milestones, setMilestones] = useState([]);
  const [milestoneInput, setMilestoneInput] = useState({ title: "", amount: "" });
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    dispatch(reset());
    setLocalError("");
  }, [dispatch]);

  useEffect(() => {
    if (isError) setLocalError(message || "An issue occurred while publishing.");
  }, [isError, message]);

  const onChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddMilestone = () => {
    if (!milestoneInput.title.trim() || !milestoneInput.amount) return;
    setMilestones([...milestones, { title: milestoneInput.title.trim(), amount: Number(milestoneInput.amount) }]);
    setMilestoneInput({ title: "", amount: "" });
  };

  const handleRemoveMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setIsUploading(true);
      const config = { headers: { Authorization: `Bearer ${user?.token}`, "Content-Type": "multipart/form-data" } };
      const response = await axios.post("http://localhost:5000/api/profile/upload", uploadData, config);
      setAttachments([...attachments, response.data.fileUrl]);
    } catch (error) {
      setLocalError("Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (!formData.title.trim() || !formData.description.trim() || !formData.maxPr) {
      setLocalError("Please fill out all core fields.");
      return;
    }

    const skillsArray = formData.skillsRequired.split(",").map(s => s.trim()).filter(s => s !== "");
    const milestoneTotal = milestones.reduce((sum, m) => sum + m.amount, 0);

    if (milestoneTotal > Number(formData.maxPr)) {
      setLocalError("The sum of your milestones cannot exceed the Max Budget Price Ceiling.");
      return;
    }

    const gigData = {
      ...formData,
      maxPr: Number(formData.maxPr),
      skillsRequired: skillsArray,
      milestones,
      attachments,
    };

    dispatch(createGig(gigData))
      .unwrap()
      .then(() => {
        dispatch(reset());
        navigate("/dashboard");
      })
      .catch((err) => setLocalError(err || "Publishing request rejected."));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 text-left animate-fadeIn">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Post a New Gig Project</h1>
          <p className="text-xs text-gray-500 mt-1">Define the scope, budget, and milestones to attract the right freelancer.</p>
        </div>
        <hr className="my-6 border-gray-100" />

        <form onSubmit={onSubmit} className="space-y-6">
          {localError && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">⚠️ {localError}</div>}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Project Scope Title</label>
            <input type="text" name="title" value={formData.title} onChange={onChange} required className="w-full text-sm px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white outline-none shadow-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category Vector</label>
              <input type="text" name="category" value={formData.category} onChange={onChange} required className="w-full text-sm px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white outline-none shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Max Budget (₹)</label>
              <input type="number" name="maxPr" value={formData.maxPr} onChange={onChange} required min="1" className="w-full text-sm px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white outline-none shadow-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Required Skills (Comma-Separated)</label>
            <input type="text" name="skillsRequired" value={formData.skillsRequired} onChange={onChange} required className="w-full text-sm px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white outline-none shadow-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Detailed Specifications Overview</label>
            <textarea name="description" value={formData.description} onChange={onChange} required rows="5" className="w-full text-sm px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white outline-none shadow-sm leading-relaxed"></textarea>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Define Project Milestones</h3>
              <p className="text-xs text-gray-500 mb-3">Break the project into smaller deliverables and attach a budget chunk to each.</p>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <input type="text" value={milestoneInput.title} onChange={(e) => setMilestoneInput({ ...milestoneInput, title: e.target.value })} placeholder="e.g., UI Wireframes" className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-300 outline-none" />
              </div>
              <div className="w-32">
                <input type="number" value={milestoneInput.amount} onChange={(e) => setMilestoneInput({ ...milestoneInput, amount: e.target.value })} placeholder="Amount (₹)" className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-300 outline-none" />
              </div>
              <button type="button" onClick={handleAddMilestone} className="bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl h-[42px] hover:bg-gray-800 transition">Add</button>
            </div>
            
            {milestones.length > 0 && (
              <ul className="mt-4 space-y-2">
                {milestones.map((m, i) => (
                  <li key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-sm">
                    <span className="font-semibold">{m.title}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-green-600 font-bold">₹{m.amount}</span>
                      <button type="button" onClick={() => handleRemoveMilestone(i)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Attach Project Documents</h3>
            <p className="text-xs text-gray-500 mb-2">Upload wireframes, design briefs, or requirement PDFs.</p>
            <div className="flex items-center gap-4">
              <input type="file" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {isUploading && <span className="text-xs text-blue-600 font-bold animate-pulse">Uploading...</span>}
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {attachments.map((url, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg border border-gray-200 truncate max-w-xs">📎 Document {i + 1} Attached</span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white text-sm font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50">
              {isLoading ? "Publishing Contract..." : "Publish Gig to Marketplace Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGig;