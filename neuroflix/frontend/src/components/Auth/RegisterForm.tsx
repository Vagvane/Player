import { useState, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * RegisterForm — standalone new-account form for Neuroflix.
 *
 * Behavior:
 * - Required: email, password (≥6 chars), confirm-password (must match),
 *   organization. Optional: first/last name (sent as `undefined` when blank
 *   so the server payload stays minimal).
 * - On submit, runs `validateForm` for cross-field checks (password match,
 *   length, non-empty organization) before calling `register` from
 *   {@link useAuth}. Validation errors short-circuit before any network call.
 * - Success navigates to `/`; failure surfaces the error above the form.
 * - During submission, the entire field set is disabled to prevent
 *   double-submission and the submit button shows "Creating account...".
 */
const RegisterForm: FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = (): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    if (!organization.trim()) {
      return 'Organization is required';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email,
        password,
        organization,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const errorId = 'register-form-error';
  const inputClass =
    'w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-2';
  const errorAria = error
    ? { 'aria-invalid': true as const, 'aria-describedby': errorId }
    : {};

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">
        Sign Up for Neuroflix
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={isLoading} className="space-y-4 border-0 p-0 m-0">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email *
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
              {...errorAria}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password * (min 6 characters)
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              aria-required="true"
              {...errorAria}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              aria-required="true"
              {...errorAria}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="organization" className={labelClass}>
              Organization *
            </label>
            <input
              type="text"
              id="organization"
              name="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
              autoComplete="organization"
              aria-required="true"
              {...errorAria}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="firstName" className={labelClass}>
              First Name (optional)
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="lastName" className={labelClass}>
              Last Name (optional)
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </fieldset>
      </form>

      <p className="mt-4 text-center text-gray-400 text-sm">
        Already have an account?{' '}
        <a href="/login" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
};

export default RegisterForm;
