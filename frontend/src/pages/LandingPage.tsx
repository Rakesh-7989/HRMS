import React, { lazy, Suspense } from 'react';
import { PageTransition } from '@/components/common/PageTransition';
import { Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';

const HeroSection = lazy(() => import('@/components/marketing/HeroSection').then(m => ({ default: m.HeroSection })));
const TrustBar = lazy(() => import('@/components/marketing/TrustBar').then(m => ({ default: m.TrustBar })));
const FeatureGrid = lazy(() => import('@/components/marketing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const TestimonialsSection = lazy(() => import('@/components/marketing/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })));
const TrustSignals = lazy(() => import('@/components/marketing/TrustSignals').then(m => ({ default: m.TrustSignals })));
const CTASection = lazy(() => import('@/components/marketing/CTASection').then(m => ({ default: m.CTASection })));
const CaseStudiesSection = lazy(() => import('@/components/marketing/CaseStudiesSection').then(m => ({ default: m.CaseStudiesSection })));
const LandingFooter = lazy(() => import('@/components/marketing/LandingFooter').then(m => ({ default: m.LandingFooter })));

const SectionFallback = () => (
  <div className="h-64 flex items-center justify-center">
    <Loader2 size={24} className="animate-spin text-neutral-400" />
  </div>
);

export const LandingPage: React.FC = () => {
  return (
    <PageTransition className="min-h-screen bg-white dark:bg-neutral-950">
      <SEO
        title="HR & Payroll Platform for Indian SMBs"
        description="Full-featured HRMS with PF, ESI, PT, LWF, and Form 16 compliance. Automate attendance, leave, payroll, and performance for Indian businesses."
        keywords="HRMS India, Payroll Software, PF ESI Compliance, HR Software for SMBs, Indian Payroll, Form 16, Attendance Management"
      />
      <Suspense fallback={<SectionFallback />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TrustBar />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <FeatureGrid />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TrustSignals />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TestimonialsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <CaseStudiesSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <CTASection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <LandingFooter />
      </Suspense>
    </PageTransition>
  );
};