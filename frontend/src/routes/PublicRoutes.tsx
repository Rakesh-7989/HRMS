import { Route } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { PricingPage } from '@/pages/PricingPage';
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage';
import { PaymentFailurePage } from '@/pages/PaymentFailurePage';
import { BillingPortalPage } from '@/pages/BillingPortalPage';

export const PublicRoutes = (
    <>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-failure" element={<PaymentFailurePage />} />
        <Route path="/billing" element={<BillingPortalPage />} />
    </>
);
