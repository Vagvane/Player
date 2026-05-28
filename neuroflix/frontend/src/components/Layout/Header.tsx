import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Top-level site navigation bar.
 *
 * Renders the Neuroflix wordmark on the left and a context-aware nav on the
 * right: signed-in users see a Home link, their email, and a Logout action;
 * signed-out visitors see Login and Sign Up links. Logging out clears auth
 * state via {@link useAuth} and redirects to `/login`.
 *
 * The user email is hidden on viewports narrower than 640px so the bar stays
 * legible on small screens.
 */
const Header: FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-red-600">
              Neuroflix
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
                <Link to="/upload" className="text-gray-300 hover:text-white transition-colors">
                  Upload
                </Link>

                {/* User menu */}
                <div className="flex items-center gap-4">
                  <span className="hidden sm:inline text-sm text-gray-400">
                    {user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="
                      px-4 py-2 rounded
                      bg-gray-800 hover:bg-gray-700
                      text-white text-sm
                      transition-colors
                    "
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="
                    px-4 py-2 rounded
                    bg-red-600 hover:bg-red-700
                    text-white text-sm font-medium
                    transition-colors
                  "
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
