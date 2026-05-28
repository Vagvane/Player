import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export interface ProtectedRouteProps {
  /** Element tree to render once authentication is confirmed. */
  children: ReactNode;
  /** Path to redirect unauthenticated users to. Defaults to `/login`. */
  redirectTo?: string;
}

/**
 * ProtectedRoute — gates child routes behind an authenticated session.
 *
 * Behavior:
 * - While {@link useAuth} reports `isLoading`, renders a full-screen
 *   "Loading..." placeholder so the login page never flashes before the
 *   session has been resolved (e.g. on hard refresh while a token check is
 *   in flight).
 * - When the user is not authenticated, redirects to `redirectTo` (default
 *   `/login`) using `replace` so the protected URL is not pushed onto the
 *   browser history — back-button after login won't bounce the user out.
 *   The originally requested location is forwarded in `state.from` so the
 *   login page can return the user there post-sign-in.
 * - When authenticated, renders `children` unchanged.
 *
 * @example
 * ```tsx
 * // In App.tsx:
 * <Route
 *   path="/video/:id"
 *   element={
 *     <ProtectedRoute>
 *       <VideoPlayerPage />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex items-center justify-center bg-gray-900"
      >
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
