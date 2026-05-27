import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function FreelancerApplyVerification() {
  const { user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({ bio: "", skills: "" });

  // Fetch user profile to get verification status from backend authorization context
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Target your core auth profile configuration endpoint securely
        const response = await axios.get(`${BASE_URL}/api/auth/me`, config);
        setProfile(response.data);

        // Pre-fill form variables if professional background details exist
        if (response.data?.bio || response.data?.skills) {
          setFormData({
            bio: response.data.bio || "",
            skills: Array.isArray(response.data.skills)
              ? response.data.skills.join(", ")
              : response.data.skills || ""
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile background metrics:", error);
        setErrorMessage("Failed to load profile authorization information.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.bio.trim()) {
      setErrorMessage("Professional bio summary is required.");
      return;
    }

    if (!formData.skills.trim()) {
      setErrorMessage("At least one target marketplace skill is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Split comma-separated inputs out into a sanitized array structure
      const skillsArray = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill !== "");

      // Step 1: Update profile with text bio and skills array mapping structures
      await axios.put(
        `${BASE_URL}/api/profile/update`,
        { bio: formData.bio.trim(), skills: skillsArray },
        config
      );

      // Step 2: Fire authorization patch request to advance database pipeline to "pending"
      const verificationResponse = await axios.patch(
        `${BASE_URL}/api/profile/apply-verification`,
        {},
        config
      );

      setSuccessMessage("Application submitted successfully! Your profile is now under administrative review.");
      
      // FIXED: Safely blend incoming backend state without overriding existing profile variables
      setProfile((prev) => ({
        ...prev,
        bio: formData.bio.trim(),
        skills: skillsArray,
        verificationStatus: verificationResponse.data?.verificationStatus || "pending"
      }));

      // Reload window environment smoothly after state mutation notice finishes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Profile submission block error exception:", error);
      const message =
        error.response?.data?.message || error.message || "Failed to submit verification application.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex h-96 w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Determine user authorization track using fallback state cascading logic
  const verificationStatus = profile?.verificationStatus || user?.verificationStatus || "unapplied";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        
        {/* VERIFIED STATUS PANEL PREVIEW */}
        {verificationStatus === "verified" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Profile Verified</h3>
                  <p className="mt-1 text-sm text-green-700">
                    You have been fully approved to view open marketplace contracts and submit project proposals. Welcome aboard!
                  </p>
                </div>
              </div>
            </div>

            {profile?.bio && (
              <div className="space-y-3 border-t border-gray-200 pt-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Professional Bio</h4>
                  <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
                </div>
                {profile?.skills && profile.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Active Marketplace Skills</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <span key={index} className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 uppercase tracking-wide">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PENDING STATUS REVIEW DRAWER */}
        {verificationStatus === "pending" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                  <svg className="h-6 w-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900">Application Under Review</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Your account verification submission is currently being reviewed by our administrative team. Your terminal interface will unlock immediately upon approval.
                  </p>
                </div>
              </div>
            </div>

            {profile?.bio && (
              <div className="space-y-3 border-t border-gray-200 pt-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Submitted Summary Bio</h4>
                  <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
                </div>
                {profile?.skills && profile.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Submitted Skills Ledger</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <span key={index} className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 uppercase tracking-wide">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* UNAPPLIED / REJECTED APPLICATION FORM MODULE */}
        {(verificationStatus === "unapplied" || verificationStatus === "rejected") && (
          <div className="space-y-6">
            {verificationStatus === "rejected" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Application Declined</h3>
                    <p className="mt-1 text-sm text-red-700">
                      Your previous application was not approved. Please expand on your skill highlights, revise your professional background overview below, and resubmit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Apply for Marketplace Access</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Complete your contractor profile data tracking points to secure administrative authorization and begin bidding on contracts.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              )}

              {/* BIO INPUT BLOCK */}
              <div>
                <label htmlFor="bio" className="block text-sm font-semibold text-gray-900">Professional Summary Bio</label>
                <p className="mt-1 text-xs text-gray-500">Highlight your engineering, full-stack development, or creative background expertise details.</p>
                <textarea
                  id="bio"
                  name="bio"
                  rows="4"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="I have extensive experience in full-stack web application development specializing in React, Next.js, and Node.js backend engines..."
                  className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition shadow-sm"
                  required
                />
              </div>

              {/* SKILLS INPUT BLOCK */}
              <div>
                <label htmlFor="skills" className="block text-sm font-semibold text-gray-900">Core Technical Skills (Comma-Separated)</label>
                <p className="mt-1 text-xs text-gray-500">Provide accurate platform tag indices separated by commas to map matching client contracts.</p>
                <input
                  type="text"
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  placeholder="React, Next.js, Node.js, Python, MongoDB"
                  className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition shadow-sm"
                  required
                />
              </div>

              {/* SUBMIT EXECUTION TRIGGER */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition shadow-sm ${
                  isSubmitting
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                }`}
              >
                {isSubmitting ? "Processing Application Submittal..." : "Submit Verification Profile"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}