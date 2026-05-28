import { type FC } from 'react';

import RegisterForm from '../components/Auth/RegisterForm';
import Container from '../components/Layout/Container';

const RegisterPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12">
      <Container maxWidth="md">
        <RegisterForm />
      </Container>
    </div>
  );
};

export default RegisterPage;