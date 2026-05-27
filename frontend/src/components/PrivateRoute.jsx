import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function PrivateRoute() {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Extract the true nested user record structure matching your backend public profile schema
  const currentUser = user?.user || user;
  
  // 🔐 EMAIL SECURITY GATING CHECK:
  // If the profile document explicitly states email verification is outstanding,
  // we redirect them to a clear notice dashboard page instead of loading internal tools.
  if (currentUser && currentUser.isEmailVerified === false) {
    return <Navigate to="/verify-notice" replace />;
  }

  return <Outlet />;
}