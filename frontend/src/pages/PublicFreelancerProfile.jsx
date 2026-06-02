import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { getFreelancerReviews } from "../features/reviews/reviewSlice";

export default function PublicFreelancerProfile({ freelancerId, hideBackButton }) {
  const { id: paramId } = useParams(); 
  const id = freelancerId || paramId; // Use the prop if inside a modal, otherwise use URL
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector((state) => state.auth);
  const { freelancerStats, reviews } = useSelector((state) => state.reviews) || {};

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
        const config = { headers: { Authorization: `Bearer ${currentUser?.token}` } };
        
        const response = await axios.get(`${backendUrl}/api/profile/freelancer/${id}`, config);
        setProfileData(response.data.profile);
        setUserData(response.data.user);

        dispatch(getFreelancerReviews(id));
      } catch (error) {
        console.error("Failed to load public profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (id && currentUser?.token) fetchPublicProfile();
  }, [id, currentUser, dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex justify-center items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  
  if (!profileData) {
    return (
      <div className="text-center py-20 font-bold text-gray-500">
        Profile not found or has not been set up yet.
      </div>
    );
  }

  const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";

  return (
    <div className={`w-full mx-auto px-4 ${hideBackButton ? 'py-6' : 'py-12'} animate-fadeIn`}>
      
      {/* Hide back button when viewed inside a modal */}
      {!hideBackButton && (
        <button onClick={() => navigate(-1)} className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition">
          ← Back
        </button>
      )}

      {/* HEADER INFO */}
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 mb-8 mt-2">
        <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-black text-white shadow-md shrink-0">
          {userData?.name?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center md:justify-start gap-2">
            {userData?.name || "Freelancer"}
            {userData?.verificationStatus === "verified" && <span className="text-blue-500 text-xl" title="Verified Expert">☑️</span>}
          </h1>
          <p className="text-gray-500 mt-1 font-medium">{userData?.email}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
            <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider">
              ${profileData.hourlyRate || 0}/hr
            </span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider">
              Max Project: ${profileData.maxPr || 0}
            </span>
          </div>
        </div>
        {profileData.resumeUrl && (
          <a href={`${backendUrl}${profileData.resumeUrl}`} target="_blank" rel="noreferrer" className="shrink-0 bg-gray-900 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition shadow-md">
            📄 View Resume
          </a>
        )}
      </div>

      {/* SMART REPUTATION & ANALYTICS DASHBOARD */}
      {freelancerStats && freelancerStats.totalReviews > 0 && (
        <div className="mb-8 bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-8 shadow-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-sm font-bold uppercase tracking-widest text-blue-300 mb-2">Verified Reputation</h2>
              <div className="flex items-end gap-3">
                <span className="text-6xl font-black">{freelancerStats.averageRating > 0 ? freelancerStats.averageRating.toFixed(1) : "0.0"}</span>
                <span className="text-xl text-blue-200 mb-1.5">/ 5.0</span>
              </div>
              <p className="mt-2 text-sm text-blue-100 font-medium">Based on <span className="font-bold text-white">{freelancerStats.totalReviews}</span> verified contracts.</p>
            </div>
            <div className="flex-1 w-full space-y-4 bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/20">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-blue-100">Quality of Work</span><span>{freelancerStats.analytics?.quality.toFixed(1) || "0.0"}</span></div>
                <div className="w-full bg-blue-950 rounded-full h-2"><div className="bg-green-400 h-2 rounded-full" style={{ width: `${((freelancerStats.analytics?.quality || 0) / 5) * 100}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-blue-100">Communication</span><span>{freelancerStats.analytics?.communication.toFixed(1) || "0.0"}</span></div>
                <div className="w-full bg-blue-950 rounded-full h-2"><div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${((freelancerStats.analytics?.communication || 0) / 5) * 100}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-blue-100">Timeliness</span><span>{freelancerStats.analytics?.timeliness.toFixed(1) || "0.0"}</span></div>
                <div className="w-full bg-blue-950 rounded-full h-2"><div className="bg-blue-400 h-2 rounded-full" style={{ width: `${((freelancerStats.analytics?.timeliness || 0) / 5) * 100}%` }}></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SKILLS & EXPERIENCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">🚀 Technical Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profileData.skills?.length > 0 ? profileData.skills.map((s, i) => (
              <span key={i} className="bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">{s.name} ({s.proficiency})</span>
            )) : <p className="text-sm text-gray-400 italic">No skills listed yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">🏢 Work Experience</h3>
          <div className="space-y-4">
            {profileData.workExperience?.length > 0 ? profileData.workExperience.map((work, index) => (
              <div key={index}>
                <h4 className="font-bold text-gray-900 text-sm">{work.title} at {work.company}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(work.startDate).toLocaleDateString()} - {work.endDate ? new Date(work.endDate).toLocaleDateString() : "Present"}</p>
              </div>
            )) : <p className="text-sm text-gray-400 italic">No experience listed yet.</p>}
          </div>
        </div>
      </div>

      {/* PORTFOLIO */}
      {profileData.portfolioGallery?.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm mb-8">
          <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">🖼️ Portfolio Gallery</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {profileData.portfolioGallery.map((imgUrl, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={`${backendUrl}${imgUrl}`} alt="Portfolio" className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENT REVIEWS */}
      {reviews && reviews.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Client Feedback</h3>
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{review.gig?.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Reviewed by: {review.client?.name}</p>
                </div>
                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-xl border border-green-200 font-bold text-sm">
                  <span>⭐ {review.rating?.toFixed(1) || 5.0}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 italic border-l-2 border-gray-200 pl-3">"{review.reviewText}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}