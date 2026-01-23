import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const validationSchema = Yup.object({
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
  rememberMe: Yup.boolean(),
});

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      email: localStorage.getItem('lastEmail') || '',
      password: '',
      rememberMe: localStorage.getItem('lastEmail') ? true : false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      try {
        if (values.rememberMe) {
          localStorage.setItem('lastEmail', values.email);
        } else {
          localStorage.removeItem('lastEmail');
        }
        await login(values);
      } catch (err: any) {
        let errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Login failed. Please check your connection.';

        if (errorMessage === 'Invalid credentials') {
          errorMessage = 'Incorrect email or password. Please try again.';
        } else if (errorMessage.toLowerCase().includes('deactivated') || errorMessage.toLowerCase().includes('inactive')) {
          errorMessage = 'Your account has been deactivated. Please contact support.';
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <AnimatedLogo size="lg" />
          <span className="text-2xl font-bold text-primary-gradient tracking-widest">WellZo</span>
        </div>

        <Card>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Welcome back</h1>
            <p className="text-gray-600 dark:text-muted transition-colors duration-300">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...formik.getFieldProps('email')}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-gold text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-muted transition-colors duration-300"
                placeholder="you@company.com"
              />
              {formik.touched.email && formik.errors.email && (
                <p className="mt-1 text-sm text-red-400">{formik.errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...formik.getFieldProps('password')}
                  className="w-full px-4 py-2.5 pr-11 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-gold text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-muted transition-colors duration-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-primary"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-sm text-red-400">{formik.errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...formik.getFieldProps('rememberMe')}
                  className="w-4 h-4 rounded border-gray-300 dark:border-dark-border bg-white dark:bg-white/5 text-primary focus:ring-gold transition-colors duration-300"
                />
                <span className="text-sm text-gray-600 dark:text-muted transition-colors duration-300">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-muted transition-colors duration-300">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-primary hover:underline">
                Register now
              </a>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border transition-colors duration-300">
            <a
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to home
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};
