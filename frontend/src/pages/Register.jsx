import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { register, googleLogin, reset } from "../features/auth/authSlice";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Tracks password visibility toggle
  const [role, setRole] = useState("freelancer");
  const googleBtnRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth,
  );

  // Initialize official Google Identity Services button frame for registration page
  useEffect(() => {
    if (!isSuccess && window.google && googleBtnRef.current) {
      window.google.accounts.id.initialize({
        client_id:
          "649571279901-0i1ojq202de8tun07tahjo641tqhhbd5.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: "382",
        text: "signup_with",
      });
    }
  }, [isSuccess]);

  // Handle live feedback, form states, and instant landing page redirection
  useEffect(() => {
    if (isError) {
      toast.error(message || "Something went wrong. Please try again.");
    }

    // Fires instantly when standard registration completes OR when Google OAuth resolves
    if (isSuccess) {
      toast.success(
        "Account created successfully! A verification link has been sent to your Gmail inbox.",
      );

      // Clear internal form fields cleanly
      setFullName("");
      setEmail("");
      setPassword("");

      // Instantly push the newly created profile onto the landing page
      navigate("/");
    } else if (user) {
      // Direct catch for third-party syncs (Google auth provides user but might bypass custom registration success flags)
      toast.success("Signed up successfully with Google!");
      navigate("/");
    }
  }, [isError, isSuccess, user, message, navigate]);

  // Isolated Cleanup Effect: Ensures state resets ONLY when the component unmounts completely
  useEffect(() => {
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  // Callback wrapper executed automatically when user completes Google Authentication modal
  function handleGoogleCredentialResponse(response) {
    if (response.credential) {
      dispatch(googleLogin(response.credential));
    }
  }

  function onSubmit(e) {
    e.preventDefault();

    dispatch(
      register({
        name: fullName,
        email: email.trim().toLowerCase(),
        password,
        role,
      }),
    );
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-gradient-to-b from-gray-50 to-white px-4 py-12 animate-fadeIn">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <span className="text-xl font-bold">S</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Join SkillSphere and start working with the right people.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <div className="mt-2">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  required
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="block w-full rounded-xl border border-gray-200 bg-white pl-4 pr-12 py-3 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                {/* Toggle Password Eye Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700">
                Role
              </span>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30">
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={role === "client"}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      Client
                    </span>
                    <span className="block text-xs text-gray-600">
                      Hire freelancers for projects
                    </span>
                  </span>
                </label>

                <label className="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30">
                  <input
                    type="radio"
                    name="role"
                    value="freelancer"
                    checked={role === "freelancer"}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      Freelancer
                    </span>
                    <span className="block text-xs text-gray-600">
                      Find work and get paid
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-px disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* THIRD PARTY IDENTITY FEDERATION PANEL FRAME FOR SIGNUP */}
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-5">
              <div className="absolute w-full border-t border-gray-200" />
              <span className="relative bg-white px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Or continue with
              </span>
            </div>

            {/* Securely mounts the true official Google rendered signup button object */}
            <div
              ref={googleBtnRef}
              className="flex justify-center w-full min-h-[44px]"
            />
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Login here
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Use a strong password to keep your account secure.
        </p>
      </div>
    </div>
  );
}