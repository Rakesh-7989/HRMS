import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, IndianRupee, ClipboardList, Calendar, Shield,
  Users, FileText, Network, Briefcase, MessageCircle,
  ArrowRight, Fingerprint, BadgeCheck,
} from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/utils/constants';

interface Feature {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  isLarge?: boolean;
  indiaBadge?: string;
}

const features: Feature[] = [
  {
    id: 'payroll',
    title: 'Payroll with PF/ESI/PT',
    icon: IndianRupee,
    color: 'brand',
    description: 'Auto-calculated payroll with PF, ESI, PT, LWF, and TDS deductions. Generate Form 16, payslips, and compliance returns in one click.',
    isLarge: true,
    indiaBadge: 'PF/ESI/PT Compliant',
  },
  {
    id: 'geofencing',
    title: 'Geo-Fencing Attendance',
    icon: MapPin,
    color: 'teal',
    description: 'GPS-based check-in with office boundary validation. Perfect for field sales and remote teams.',
    indiaBadge: 'Aadhaar Ready',
  },
  {
    id: 'leave',
    title: 'Leave & Holiday Mgmt',
    icon: Calendar,
    color: 'coral',
    description: 'Central, state, and festival holiday calendars. Automatic leave accrual as per Indian labour laws.',
    indiaBadge: 'Indian Labour Law',
  },
  {
    id: 'attendance',
    title: 'Smart Attendance',
    icon: ClipboardList,
    color: 'brand',
    description: 'Biometric, RFID, QR, and web check-in. Overtime calculation with shift differentials.',
  },
  {
    id: 'shifts',
    title: 'Shift Planning & Roster',
    icon: Users,
    color: 'teal',
    description: 'Dynamic shift scheduling with swap requests, auto-roster, and attendance integration.',
  },
  {
    id: 'statutory',
    title: 'Statutory Compliance',
    icon: Shield,
    color: 'coral',
    description: 'Auto-generated PF ECR, ESI return, PT return, LWF challans. Stay compliant effortlessly.',
    isLarge: true,
    indiaBadge: 'Govt Compliant',
  },
  {
    id: 'recruitment',
    title: 'Recruitment & ATS',
    icon: Briefcase,
    color: 'brand',
    description: 'Job postings, resume parsing, interview scheduling, and offer letter automation.',
  },
  {
    id: 'performance',
    title: 'Performance Management',
    icon: BadgeCheck,
    color: 'teal',
    description: 'KPI/OKR tracking, 360-degree feedback, review cycles, and skill gap analysis.',
  },
  {
    id: 'tax',
    title: 'Tax Declarations & Form 16',
    icon: FileText,
    color: 'coral',
    description: 'Employee tax declaration portal, Form 16 generation, new vs old regime comparison.',
    indiaBadge: 'New Tax Regime',
  },
  {
    id: 'org',
    title: 'Org Chart & Directory',
    icon: Network,
    color: 'brand',
    description: 'Interactive org chart with department mapping, reporting hierarchy, and employee directory.',
  },
  {
    id: 'collaboration',
    title: 'Chat & Collaboration',
    icon: MessageCircle,
    color: 'teal',
    description: 'Real-time team chat, announcements, video calls, and knowledge base.',
  },
  {
    id: 'biometric',
    title: 'Biometric Integration',
    icon: Fingerprint,
    color: 'coral',
    description: 'Works with all major Indian biometric devices — Mantra, eSSL, ZKTeco.',
    indiaBadge: 'All Devices',
  },
];

const colorConfig: Record<string, { text: string; bg: string; border: string }> = {
  brand: { text: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', border: 'border-brand-200 dark:border-brand-800' },
  teal: { text: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },
  coral: { text: 'text-coral-500', bg: 'bg-coral-50 dark:bg-coral-900/20', border: 'border-coral-200 dark:border-coral-800' },
};

export const FeatureGrid: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id="features" className="py-24 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-brand-500 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            {t('marketing.features.sectionTitle')}
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-neutral-900 dark:text-white">
            {t('marketing.features.sectionSubtitle')}
          </AnimatedText>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
            {t('marketing.features.sectionDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(200px,_auto)]">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colors = colorConfig[feature.color] || colorConfig.brand;
            const isLarge = feature.isLarge;

            return (
              <motion.div key={feature.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn('group relative rounded-2xl border p-6 transition-all duration-300 cursor-default',
                  'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
                  'hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-elev-4 hover:shadow-brand-500/5',
                  isLarge ? 'md:col-span-2 lg:row-span-2' : '')}
              >
                {feature.indiaBadge && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-[10px] font-bold tracking-wider">
                    {feature.indiaBadge}
                  </span>
                )}
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', colors.bg, colors.text)}>
                      <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{feature.description}</p>
                  </div>
                  {isLarge && (
                    <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                       <Button variant="ghost" className="text-sm font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1">
                        {t('common.view')} <ArrowRight size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mt-16">
          <Button variant="premium" size="lg" onClick={() => navigate(ROUTES.FEATURES)}>
            {t('marketing.features.cta')} <ArrowRight size={20} />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
