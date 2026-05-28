import { useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * LoginForm — standalone email/password sign-in form for Neuroflix.
 *
 * Behavior:
 * - Controlled inputs for email and password.
 * - HTML5 validation enforces a valid email and a minimum 6-character password
 *   before `handleSubmit` runs.
 * - On submit, calls `login(email, password)` from {@link useAuth}. Success
 *   navigates to `/` (home/player); failure surfaces the error above the form.
 * - While the request is in flight, inputs and the submit button are disabled
 *   to prevent double-submission; the button label becomes "Signing in...".
 * - Errors are cleared at the start of each submission so stale messages
 *   don't persist across retries.
 */
const LoginForm: FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const errorId = 'login-form-error';

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">
        Sign In to Neuroflix
      </h2>

      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <fieldset disabled={isLoading} className="space-y-4 border-0 p-0 m-0">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? errorId : undefined}
              className="
                w-full px-4 py-3 rounded-lg
                bg-gray-800 text-white
                border border-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? errorId : undefined}
              className="
                w-full px-4 py-3 rounded-lg
                bg-gray-800 text-white
                border border-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="
              w-full py-3 rounded-lg
              bg-red-600 hover:bg-red-700
              text-white font-semibold
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-red-500
            "
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </fieldset>
      </form>

      <p className="mt-4 text-center text-gray-400 text-sm">
        Don't have an account?{' '}
        <a href="/register" className="text-blue-500 hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
};

export default LoginForm;
