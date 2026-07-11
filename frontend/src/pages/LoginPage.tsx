import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth.service';
import { Shield } from 'lucide-react';
import { usersService } from '@/services/users.service';
import { ROLE_DASHBOARDS } from '@/utils/constants';

import { useTranslation } from 'react-i18next';

// Moved inside component or create a factory
const createValidationSchema = (t: any) => Yup.object({
  email: Yup.string().email(t('auth.validEmail')).required(t('auth.emailRequired')),
  password: Yup.string().required(t('auth.passwordRequired')),
  rememberMe: Yup.boolean(),
});

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = React.useState(false);
  const [preAuthToken, setPreAuthToken] = React.useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = React.useState('');
  const { setUser } = useAuth() as any; // Need access to setUser for 2FA flow

  React.useEffect(() => {
    if (twoFactorToken.length === 6 && twoFactorRequired) {
      handle2FAVerify(new Event('submit') as any);
    }
  }, [twoFactorToken, twoFactorRequired]);

  const finalValidationSchema = React.useMemo(() => createValidationSchema(t), [t]);

  const formik = useFormik({
    initialValues: {
      email: localStorage.getItem('lastEmail') || '',
      password: '',
      rememberMe: localStorage.getItem('lastEmail') ? true : false,
    },
    validationSchema: finalValidationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      try {
        if (values.rememberMe) {
          localStorage.setItem('lastEmail', values.email);
        } else {
          localStorage.removeItem('lastEmail');
        }
        const res = await login(values);
        if (res?.status === '2FA_REQUIRED') {
          setTwoFactorRequired(true);
          setPreAuthToken(res.preAuthToken);
        }
      } catch (err: any) {
        // Check for payment pending response
        const responseData = err.response?.data;
        if (responseData?.paymentPending) {
          // Redirect to complete payment page
          const params = new URLSearchParams({
            tenant_id: responseData.tenant_id,
            email: responseData.email
          });
          window.location.href = `/complete-payment?${params.toString()}`;
          return;
        }

        let errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Login failed. Please check your connection.';

        if (errorMessage === 'Invalid credentials') {
          errorMessage = t('auth.invalidCredentials');
        } else if (errorMessage.toLowerCase().includes('deactivated') || errorMessage.toLowerCase().includes('inactive')) {
          errorMessage = t('auth.accountDeactivated');
        } else if (errorMessage === 'Payment Pending') {
          errorMessage = 'Your registration payment is pending. Please complete the payment to access the application.';
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken || !preAuthToken) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.verify2FALogin(twoFactorToken, preAuthToken, formik.values.rememberMe);

      // Manually handle the success flow since we're bypassing context's login
      const profile = await usersService.getMyProfile();
      const user = response.user;
      if (profile) {
        Object.assign(user, {
          first_name: profile.first_name || user.first_name || '',
          last_name: profile.last_name || user.last_name || '',
          phone: profile.phone || user.phone,
          email: profile.email || user.email,
        });
        localStorage.setItem('user', JSON.stringify(user));
      }
      setUser(user);

      const dashboard = ROLE_DASHBOARDS[user.role] || '/dashboard/personal';
      window.location.href = dashboard; // Force redirect to ensure state is clean
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.verificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const planId = searchParams.get('plan_id');
  const cycle = searchParams.get('cycle');

  if (isAuthenticated) {
    let target = redirect;
    if (planId && redirect === '/billing') {
      target += `?plan_id=${planId}&cycle=${cycle}`;
    }
    return <Navigate to={target} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <AnimatedLogo size="lg" />
        </div>

        <Card>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('auth.welcomeBack')}</h1>
            <p className="text-gray-600 dark:text-muted transition-colors duration-300">{t('auth.signInSubtitle')}</p>
          </div>

          <ValidationAlert message={error || undefined} type="error" />

          {twoFactorRequired ? (
            <div className="space-y-4">
              <div className="p-4 bg-brand-500/5 rounded-xl border border-brand-500/10 flex items-center gap-3">
                <Shield className="text-brand-500" size={20} />
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {t('auth.enterCode')}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="2fa-token" className="block text-sm font-medium">
                  {t('auth.twoFactorCode')}
                </label>
                <Input
                  id="2fa-token"
                  placeholder="000000"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-3xl tracking-[1em] font-mono h-16"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setTwoFactorRequired(false)}
                >
                  {t('auth.back')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  onClick={handle2FAVerify}
                  isLoading={isLoading}
                  disabled={twoFactorToken.length < 6}
                >
                  {t('auth.verify')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={formik.handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t('auth.email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  {...formik.getFieldProps('email')}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  placeholder="you@company.com"
                />
                <FormError message={formik.touched.email ? formik.errors.email : undefined} />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...formik.getFieldProps('password')}
                    error={formik.touched.password && Boolean(formik.errors.password)}
                    className="pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <FormError message={formik.touched.password ? formik.errors.password : undefined} />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...formik.getFieldProps('rememberMe')}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-brand-500 focus:ring-gold transition-colors duration-300"
                  />
                  <span className="text-sm text-gray-600 dark:text-muted transition-colors duration-300">{t('auth.rememberMe')}</span>
                </label>
                <a href="/forgot-password" className="text-sm text-brand-500 hover:underline">
                  {t('auth.forgotPassword')}
                </a>
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                {t('auth.signIn')}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-muted transition-colors duration-300">
              {t('auth.noAccount')}{' '}
              <a href="/pricing" className="text-brand-500 hover:underline">
                {t('auth.register')}
              </a>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 transition-colors duration-300">
            <a
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              {t('auth.backToHome')}
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

