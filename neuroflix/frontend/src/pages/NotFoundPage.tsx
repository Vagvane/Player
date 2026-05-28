import { type FC } from 'react';
import { Link } from 'react-router-dom';

import Container from '../components/Layout/Container';

/**
 * NotFoundPage — fallback for unmatched routes (404).
 *
 * Mount as the catch-all `path="*"` route in the router. Renders a
 * large "404" hero, a brief explanation, and a primary call-to-action
 * back to the catalog at `/`.
 */
const NotFoundPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12">
      <Container maxWidth="md">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-white mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-400 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-3 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default NotFoundPage;
