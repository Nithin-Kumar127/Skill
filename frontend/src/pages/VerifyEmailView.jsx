import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { verifyEmail, reset } from "../features/auth/authSlice";

export default function VerifyEmailView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const hasCalledAPI = useRef(false); // Prevents React 18 StrictMode from firing double token requests
  const [statusEvaluated, setStatusEvaluated] = useState(false);

  const { isLoading, isError, isSuccess, message } = useSelector((state) => state.auth);

  useEffect(() => {
    // Guard clause: enforce that the verification thunk fires exactly once per component mount
    if (hasCalledAPI.current) return;
    hasCalledAPI.current = true;

    if (token) {
      dispatch(verifyEmail(token)).then(() => {
        setStatusEvaluated(true);
      });
    } else {
      setStatusEvaluated(true);
    }
  }, [token, dispatch]);

  // Handle distinct Toastify alert side effects when state parameters resolve
  useEffect(() => {
    if (statusEvaluated && isSuccess) {
      toast.success("Email address verified successfully!");
    }
    if (statusEvaluated && isError) {
      toast.error(message || "Verification link is invalid or has expired.");
    }
  }, [statusEvaluated, isSuccess, isError, message]);

  // Isolated Cleanup Hook: Resets Redux slice variables ONLY when moving away from the page completely
  useEffect(() => {
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg text-center sm:p-8">
        
        {/* UPPER STATUS CARD BANNER HOUSINGS */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4 ring-8 transition-all">
          {isLoading && (
            <span className="text-2xl animate-spin rounded-full border-4 border-blue-600 border-t-transparent h-6 w-6" />
          )}
          {statusEvaluated && isSuccess && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 ring-4 ring-green-50">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {statusEvaluated && isError && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 ring-4 ring-red-50">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          {!statusEvaluated && !isLoading && <span className="text-2xl">📨</span>}
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Account Verification</h2>
        <p className="mt-2 text-sm text-gray-500 mb-6">Processing your workspace authorization handshake link...</p>

        {/* LOADING SCREEN CONTAINER */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <p className="text-xs font-semibold text-gray-400 animate-pulse">Checking Atlas security layers...</p>
          </div>
        )}

        {/* SUCCESS CARD CONTAINER VIEW */}
        {statusEvaluated && isSuccess && (
          <div className="space-y-4 animate-scaleUp">
            <div className="rounded-xl bg-green-50/60 p-4 font-medium text-green-800 border border-green-100 text-sm text-left leading-relaxed">
              {message || "Email address successfully verified! Your marketplace profile privileges have been unlocked completely."}
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition cursor-pointer outline-none focus:ring-4 focus:ring-blue-100 active:translate-y-px"
            >
              Go to Workspace Dashboard →
            </button>
          </div>
        )}

        {/* FAILURE CARD CONTAINER VIEW */}
        {statusEvaluated && isError && (
          <div className="space-y-4 animate-scaleUp">
            <div className="rounded-xl bg-red-50/60 p-4 font-medium text-red-800 border border-red-100 text-sm text-left leading-relaxed">
              {message || "Verification failed. This activation path link is broken, invalid, or has already expired."}
            </div>
            <div className="flex flex-col gap-2.5">
              <Link
                to="/verify-notice"
                className="w-full inline-flex items-center justify-center rounded-xl bg-gray-950 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800 transition outline-none"
              >
                Request Fresh Verification Link
              </Link>
              <Link
                to="/login"
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition underline underline-offset-4"
              >
                Return to Standard Sign In Gateway
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}