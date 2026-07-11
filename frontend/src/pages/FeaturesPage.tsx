import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, MapPin, Calendar, IndianRupee, ClipboardList, Shield,
  Briefcase, BadgeCheck, Network, MessageCircle, Fingerprint,
  FileText, Building2, ArrowRight, CheckCircle, Star,
} from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/SEO';
import { cn } from '@/utils/cn';

interface Feature {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  details: string[];
  indiaBadge?: string;
}

const categories = [
  {
    id: 'core-hr',
    label: 'Core HR',
    features: [
      { id: 'directory', title: 'Employee Directory', icon: Users, color: 'brand', description: 'Centralised employee records with search, filters, and bulk actions.', details: ['Interactive org chart', 'Role-based access', 'Custom fields', 'Document vault'] },
      { id: 'onboarding', title: 'Digital Onboarding', icon: Building2, color: 'teal', description: 'Paperless onboarding with automated workflows and task checklists.', details: ['Offer letter automation', 'Document collection', 'Asset provisioning', 'Buddy assignment'] },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance & Time',
    features: [
      { id: 'geofencing', title: 'Geo-Fencing Attendance', icon: MapPin, color: 'brand', description: 'GPS-based check-in with office boundary validation. Perfect for field sales and remote teams.', details: ['Custom geo-fences', 'IP restriction', 'QR check-in', 'Real-time tracking'], indiaBadge: 'Aadhaar Ready' },
      { id: 'biometric', title: 'Biometric Integration', icon: Fingerprint, color: 'teal', description: 'Works with all major Indian biometric devices — Mantra, eSSL, ZKTeco.', details: ['Device-agnostic API', 'Auto-sync', 'Duplicate detection', 'Offline mode'], indiaBadge: 'All Devices' },
      { id: 'shifts', title: 'Shift Planning & Roster', icon: Calendar, color: 'coral', description: 'Dynamic shift scheduling with swap requests, auto-roster, and attendance integration.', details: ['Drag-drop schedule', 'Shift swap', 'Overtime rules', 'Night shift allowance'] },
      { id: 'regularization', title: 'Attendance Regularization', icon: ClipboardList, color: 'brand', description: 'Employees can request corrections with manager approval workflow.', details: ['Missed punch', 'Early departure', 'Auto-approval rules', 'Audit trail'] },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll & Compliance',
    features: [
      { id: 'payroll', title: 'Payroll with PF/ESI/PT', icon: IndianRupee, color: 'brand', description: 'Auto-calculated payroll with PF, ESI, PT, LWF, and TDS deductions. Generate Form 16, payslips, and compliance returns in one click.', details: ['Salary structure builder', 'Arrears calculation', 'F&F settlement', 'Bank file export'], indiaBadge: 'PF/ESI/PT Compliant' },
      { id: 'statutory', title: 'Statutory Compliance', icon: Shield, color: 'teal', description: 'Auto-generated PF ECR, ESI return, PT return, LWF challans. Stay compliant effortlessly.', details: ['PF ECR generation', 'ESI return filing', 'PT return', 'LWF challan'], indiaBadge: 'Govt Compliant' },
      { id: 'tax', title: 'Tax Declarations & Form 16', icon: FileText, color: 'coral', description: 'Employee tax declaration portal, Form 16 generation, new vs old regime comparison.', details: ['Tax declaration portal', 'Form 16 auto-generation', 'Regime comparison', 'Investment proof upload'], indiaBadge: 'New Tax Regime' },
      { id: 'expenses', title: 'Expense Management', icon: IndianRupee, color: 'brand', description: 'End-to-end expense tracking with receipt upload and approval workflows.', details: ['Mileage & travel', 'Per diem rates', 'Corporate cards', 'Reimbursement'] },
    ],
  },
  {
    id: 'performance',
    label: 'Performance & Talent',
    features: [
      { id: 'reviews', title: 'Performance Reviews', icon: BadgeCheck, color: 'brand', description: 'Configurable review cycles with KPI/OKR tracking, 360-degree feedback, and skill gap analysis.', details: ['Self/manager/peer review', 'Goal alignment', 'Rating scales', 'Growth plans'] },
      { id: 'goals', title: 'Goal Management (OKR/KPI)', icon: Star, color: 'teal', description: 'Track individual and team goals aligned to organisational OKRs.', details: ['OKR framework', 'Progress tracking', 'Check-in reminders', 'Goal alignment view'] },
    ],
  },
  {
    id: 'recruitment',
    label: 'Recruitment & ATS',
    features: [
      { id: 'ats', title: 'Applicant Tracking System', icon: Briefcase, color: 'brand', description: 'End-to-end recruitment from job posting to offer letter. AI-powered resume parsing and candidate matching.', details: ['Career page integration', 'Job board syndication', 'Pipeline management', 'Offer automation'] },
      { id: 'interviews', title: 'Interview Scheduling', icon: Calendar, color: 'teal', description: 'Calendar-based scheduling with interviewer availability and feedback forms.', details: ['Auto-scheduling', 'Feedback forms', 'Rating matrix', 'Calendar sync'] },
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement & Culture',
    features: [
      { id: 'surveys', title: 'Employee Surveys', icon: ClipboardList, color: 'brand', description: 'Pulse surveys, engagement surveys, and eNPS with sentiment analysis.', details: ['Custom surveys', 'Anonymous mode', 'Sentiment analysis', 'Trend reporting'] },
      { id: 'recognition', title: 'Peer Recognition', icon: Star, color: 'teal', description: 'Recognise colleagues with awards, badges, and points redeemable for rewards.', details: ['Badges & awards', 'Points system', 'Company milestones', 'Social feed'] },
      { id: 'collaboration', title: 'Chat & Collaboration', icon: MessageCircle, color: 'coral', description: 'Real-time team chat, announcements, video calls, and knowledge base.', details: ['Direct/group chat', 'Announcements', 'File sharing', 'Knowledge base'] },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Insights',
    features: [
      { id: 'ai-insights', title: 'AI Insights Dashboard', icon: Network, color: 'brand', description: 'AI-powered predictions and recommendations for attrition, performance, and engagement.', details: ['Attrition prediction', 'Performance trends', 'Sentiment analysis', 'Skills gap'] },
      { id: 'resume-parser', title: 'AI Resume Parser', icon: FileText, color: 'teal', description: 'Auto-extract candidate details from resumes in seconds.', details: ['Multi-format support', 'Field mapping', 'Duplicate check', 'Bulk parsing'] },
    ],
  },
];

const colorMap: Record<string, { text: string; bg: string }> = {
  brand: { text: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
  teal: { text: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  coral: { text: 'text-coral-500', bg: 'bg-coral-50 dark:bg-coral-900/20' },
};

export const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <SEO
        title="All Features - HR & Payroll Platform for Indian SMBs"
        description="Explore WellZo's full feature set: PF/ESI compliance, payroll, attendance with geo-fencing, performance management, AI insights, and more."
        keywords="HRMS features India, payroll features, PF ESI compliance, attendance tracking, performance management, AI HR"
      />

      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
            <span className="font-bold">WellZo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">Pricing</Link>
            <Link to="/about" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">About</Link>
            <Button variant="premium" size="sm" onClick={() => navigate('/pricing')}>Start Free Trial</Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 bg-gradient-to-b from-neutral-950 via-brand-950 to-neutral-950 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-brand-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            className="text-brand-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            Everything You Need
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-6xl font-extrabold mb-6 text-white">
            All Features for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-teal-400">
              Indian SMBs
            </span>
          </AnimatedText>
          <p className="text-neutral-300 text-lg max-w-3xl mx-auto">
            From PF/ESI compliance to AI-powered insights — WellZo has every tool you need to manage your workforce, payroll, and culture. All in one platform.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories.map((cat) => (
            <a key={cat.id} href={`#${cat.id}`}
              className="text-center p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-elev-1 hover:shadow-elev-3 transition-all group">
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {cat.label}
              </p>
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24 space-y-32">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.id}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{cat.label}</h2>
              <div className="w-16 h-1 rounded-full bg-gradient-to-r from-brand-500 to-teal-500" />
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {cat.features.map((feat, fi) => {
                const Icon = feat.icon;
                const colors = colorMap[feat.color] || colorMap.brand;
                return (
                  <motion.div key={feat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: fi * 0.1 }}
                    className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:shadow-elev-4 hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-300">
                    {feat.indiaBadge && (
                      <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-[10px] font-bold tracking-wider">
                        {feat.indiaBadge}
                      </span>
                    )}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center shrink-0`}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {feat.title}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{feat.description}</p>
                      </div>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {feat.details.map((d) => (
                        <li key={d} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                          <CheckCircle size={12} className="text-brand-500 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="py-24 bg-gradient-to-br from-brand-900 to-neutral-950 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to See It in Action?</h2>
          <p className="text-neutral-300 mb-8">Start your 14-day free trial. No credit card needed. Full access to all features including PF/ESI compliance.</p>
          <Button variant="premium" size="xl" onClick={() => navigate('/pricing')}>
            Start Free Trial <ArrowRight size={20} />
          </Button>
        </div>
      </section>
    </div>
  );
};
