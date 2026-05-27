import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logout, reset as resetAuth } from '../features/auth/authSlice';
import { reset as resetProposals } from '../features/proposals/proposalSlice'; 
import { reset as resetGigs } from '../features/gigs/gigSlice';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const baseLink =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-px';

  const displayName = user?.name || user?.user?.name || user?.fullName || user?.email || 'User';
  
  const currentUser = user?.user?.user || user?.user || user;
  const role = currentUser?.role;

  const onLogout = () => {
    dispatch(logout());
    dispatch(resetAuth());
    dispatch(resetProposals()); 
    dispatch(resetGigs());      
    navigate('/');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/60 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-lg font-extrabold tracking-tight text-gray-900 outline-none focus:ring-4 focus:ring-blue-200"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-extrabold text-white shadow-sm">
            S
          </span>
          <span>
            Skill<span className="text-blue-600">Sphere</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium text-gray-700 sm:inline mr-2">
                Hello, <span className="font-semibold text-gray-900">{displayName}</span>
              </span>

              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  [
                    baseLink,
                    'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    isActive ? 'bg-gray-50 text-gray-900' : '',
                  ].join(' ')
                }
              >
                Dashboard
              </NavLink>

              {/* 🌟 ADDED: DYNAMIC FREELANCER PROFILE BUTTON LINK */}
              {role === 'freelancer' && (
                <NavLink
                  to="/profile/freelancer"
                  className={({ isActive }) =>
                    [
                      baseLink,
                      'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                      isActive ? 'bg-gray-50 text-gray-900' : '',
                    ].join(' ')
                  }
                >
                  My Profile
                </NavLink>
              )}

              {role === 'freelancer' && (
                <NavLink
                  to="/my-proposals"
                  className={({ isActive }) =>
                    [
                      baseLink,
                      'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                      isActive ? 'bg-gray-50 text-gray-900' : '',
                    ].join(' ')
                  }
                >
                  My Proposals
                </NavLink>
              )}

              <button
                type="button"
                onClick={onLogout}
                className={[
                  baseLink,
                  'border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 focus:ring-red-200 cursor-pointer',
                ].join(' ')}
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  [
                    baseLink,
                    'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    isActive ? 'bg-gray-50 text-gray-900' : '',
                  ].join(' ')
                }
              >
                Login
              </NavLink>

              <NavLink
                to="/register"
                className={({ isActive }) =>
                  [
                    baseLink,
                    'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700',
                    isActive ? 'ring-2 ring-blue-300 ring-offset-1' : '',
                  ].join(' ')
                }
              >
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}