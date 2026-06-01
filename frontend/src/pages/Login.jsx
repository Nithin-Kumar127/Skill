import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  login,
  verify2FA,
  googleLogin,
  reset,
  clear2FAState,
} from "../features/auth/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Manages password visibility toggle
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const googleBtnRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    user,
    requires2FA,
    temp2FAUserId,
    isLoading,
    isError,
    isSuccess,
    message,
  } = useSelector((state) => state.auth);

  // Initialize official Google Identity Services button frame
  useEffect(() => {
    if (!requires2FA && window.google && googleBtnRef.current) {
      window.google.accounts.id.initialize({
        client_id:
          "649571279901-0i1ojq202de8tun07tahjo641tqhhbd5.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: "382",
        text: "continue_with",
      });
    }
  }, [requires2FA]);

  useEffect(() => {
    if (isError) {
      // eslint-disable-next-line no-console
      console.error(message);
    }

    if ((isSuccess || user) && !requires2FA) {
      navigate("/");
    }

    return () => {
      dispatch(reset());
    };
  }, [user, requires2FA, isError, isSuccess, message, navigate, dispatch]);

  // Callback wrapper executed automatically when user completes Google Authentication modal
  function handleGoogleCredentialResponse(response) {
    if (response.credential) {
      // response.credential contains the real cryptographically signed ID Token string!
      dispatch(googleLogin(response.credential));
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    dispatch(
      login({
        email,
        password,
      }),
    );
  }

  function on2FASubmit(e) {
    e.preventDefault();
    if (!twoFactorCode) return;
    dispatch(
      verify2FA({
        userId: temp2FAUserId,
        code: twoFactorCode.trim(),
      }),
    );
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-gradient-to-b from-gray-50 to-white px-4 py-12 animate-fadeIn">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <span className="text-xl font-bold">
                {requires2FA ? "🔐" : "S"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {requires2FA
                ? "Two-Factor Authentication"
                : "Sign in to SkillSphere"}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {requires2FA
                ? "Enter the 6-digit code we just sent to your email address."
                : "Welcome back. Enter your details to continue."}
            </p>
          </div>

          {isError ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-left">
              {message || "Something went wrong. Please try again."}
            </div>
          ) : null}

          {requires2FA ? (
            <form onSubmit={on2FASubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="2fa-code"
                  className="block text-sm font-medium text-gray-700 text-left"
                >
                  <span className="font-semibold">Verification Code</span>
                </label>
                <div className="mt-2">
                  <input
                    id="2fa-code"
                    name="twoFactorCode"
                    type="text"
                    maxLength={6}
                    pattern="\d*"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="000000"
                    required
                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-lg font-bold tracking-widest text-gray-900 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-px disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? "Verifying Code..." : "Verify & Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(clear2FAState())}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition outline-none"
                >
                  ← Back to Standard Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 text-left"
                  >
                    Email
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="mt-2 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white pl-4 pr-12 py-3 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    
                    {/* Inline password toggle button */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-px disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? "Loading..." : "Sign In"}
                </button>
              </form>

              {/* SEAMLESS GOOGLE IDENTITY RENDER CONTAINER */}
              <div className="mt-6">
                <div className="relative flex items-center justify-center mb-5">
                  <div className="absolute w-full border-t border-gray-200" />
                  <span className="relative bg-white px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Or continue with
                  </span>
                </div>

                {/* Securely mounts the true official Google rendered button object */}
                <div
                  ref={googleBtnRef}
                  className="flex justify-center w-full min-h-[44px]"
                />
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-600 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Register here
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to SkillSphere&apos;s Terms and Privacy
          Policy.
        </p>
      </div>
    </div>
  );
}