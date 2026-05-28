import { type FC } from 'react';

import LoginForm from '../components/Auth/LoginForm';
import Container from '../components/Layout/Container';

/**
 * LoginPage — route-level wrapper for the sign-in form.
 *
 * Centers {@link LoginForm} in a full-viewport dark layout. The form
 * itself owns submission, validation, and post-login navigation; this
 * component only provides layout context.
 */
const LoginPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12">
      <Container maxWidth="md">
        <LoginForm />
      </Container>
    </div>
  );
};

export default LoginPage;
