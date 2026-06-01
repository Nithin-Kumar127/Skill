import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function PrivateRoute() {
  const { user } = useSelector((state) => state.auth);

  // If there is no user logged in, kick them back to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🌟 THE MAGIC FIX: Outlet tells React to render the child page (Dashboard, Profile, etc.)
  return <Outlet />;
}