import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { forgotPassword, reset } from "../features/auth/authSlice";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const dispatch = useDispatch();
  const { isLoading, isError, isSuccess, message } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isSuccess) {
      setSubmitted(true);
    }
    return () => {
      dispatch(reset());
    };
  }, [isSuccess, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    dispatch(forgotPassword({ email: email.trim().toLowerCase() }));
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-gray-900">
            Recover Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Provide your account email to receive a recovery token.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl bg-green-50 p-4 text-center ring-1 ring-green-100">
            <p className="text-sm font-semibold text-green-800">
              {message || "Instructions sent successfully!"}
            </p>
            <p className="mt-2 text-xs text-green-600 font-medium">
              Check your backend terminal window mock logs to catch your link!
            </p>
            <div className="mt-4">
              <NavLink to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-800">
                ← Return to Login
              </NavLink>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {isError && (
              <div className="rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-800 ring-1 ring-red-100">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 text-left mb-2">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/10 hover:bg-blue-700 transition active:translate-y-px disabled:opacity-50 cursor-pointer outline-none"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Send Recovery Link"
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              <NavLink to="/login" className="font-semibold text-blue-600 hover:text-blue-800 transition">
                ← Back to Login
              </NavLink>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}