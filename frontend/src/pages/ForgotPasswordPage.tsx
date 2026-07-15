import React, { useState } from 'react';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ForgotPasswordPage: React.FC = () => {
  useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setMessage('Reset link sent to your email if it exists in our system.');
    } catch (err: unknown) {
      setError((err as {message?: string})?.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <AnimatedLogo size="lg" />
        </div>

        <Card>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Forgot password</h1>
            <p className="text-gray-600 dark:text-muted">Enter your email to receive a reset link.</p>
          </div>

          {message && <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-400">{message}</div>}
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium mb-2">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-muted"
                placeholder="you@company.com"
              />
            </div>
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send reset link
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 flex justify-between text-sm">
            <a href="/login" className="text-brand-500 hover:underline flex items-center gap-2">
              <ArrowLeft size={14} />
              Back to login
            </a>
            <p className="text-gray-600 dark:text-muted">
              Don't have an account?{' '}
              <a href="/pricing" className="text-brand-500 hover:underline">
                Register now
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};


