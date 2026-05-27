import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createGig, reset } from "../features/gigs/gigSlice";

const CreateGig = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    maxPr: "",
    category: "",
    estimatedDuration: "",
    skillsRequired: "",
  });
  const [localError, setLocalError] = useState("");

  const {
    title,
    description,
    maxPr,
    category,
    estimatedDuration,
    skillsRequired,
  } = formData;

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isError, isSuccess, isLoading, message } = useSelector(
    (state) => state.gigs,
  );

  useEffect(() => {
    dispatch(reset());
    setLocalError("");
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      setLocalError(message || "An issue occurred while publishing the contract project details.");
    }
  }, [isError, message]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (!title.trim() || !description.trim() || !maxPr || !category.trim() || !estimatedDuration.trim()) {
      setLocalError("Please fill out all operational entry specification fields.");
      return;
    }

    const skillsArray = skillsRequired
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill !== "");

    if (skillsArray.length === 0) {
      setLocalError("Please list at least one required tag stack skill for verification.");
      return;
    }

    const gigData = {
      title: title.trim(),
      description: description.trim(),
      maxPr: Number(maxPr),
      category: category.trim(),
      estimatedDuration: estimatedDuration.trim(),
      skillsRequired: skillsArray,
    };

    console.log("Dispatching gig publication payload context block:", gigData);
    
    dispatch(createGig(gigData))
      .unwrap()
      .then(() => {
        dispatch(reset());
        navigate("/dashboard");
      })
      .catch((error) => {
        console.error("Create gig promise exception catch handle:", error);
        setLocalError(error || "Publishing request rejected by database network.");
      });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6 text-left animate-fadeIn">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Post a New Gig Project</h1>
          <p className="text-xs text-gray-500 mt-1">Fill out the performance guidelines context below to broadcast to marketplace professionals.</p>
        </div>
        
        <hr className="my-6 border-gray-100" />

        <form onSubmit={onSubmit} className="space-y-5">
          
          {localError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
              ⚠️ {localError}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Project Scope Title</label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={onChange}
              required
              placeholder="e.g., Build high-performance React E-commerce Engine"
              className="w-full text-xs px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white transition outline-none shadow-sm"
            />
          </div>

          {/* Category & Max Price Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category Vector</label>
              <input
                type="text"
                name="category"
                value={category}
                onChange={onChange}
                required
                placeholder="e.g., Web Development"
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white transition outline-none shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Max Budget Price Ceiling (₹)</label>
              <input
                type="number"
                name="maxPr"
                value={maxPr}
                onChange={onChange}
                required
                min="1"
                placeholder="e.g., 15000"
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white transition outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Estimated Duration & Skills Required Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Expected Deadline Duration</label>
              <input
                type="text"
                name="estimatedDuration"
                value={estimatedDuration}
                onChange={onChange}
                required
                placeholder="e.g., 3 weeks, 1 month"
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white transition outline-none shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Required Skills (Comma-Separated)</label>
              <input
                type="text"
                name="skillsRequired"
                value={skillsRequired}
                onChange={onChange}
                required
                placeholder="e.g., React, Node.js, Next.js, JavaScript"
                className="w-full text-xs px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white transition outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Detailed Specifications Overview</label>
            <textarea
              name="description"
              value={description}
              onChange={onChange}
              required
              rows="5"
              placeholder="Provide a professional summary description detailing technical project deliverables, milestone targets, and processing rules..."
              className="w-full text-xs px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 bg-white transition resize-none outline-none shadow-sm leading-relaxed"
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Publishing Contract Coordinates..." : "Publish Gig to Marketplace Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGig;