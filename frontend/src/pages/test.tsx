import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AnimatedText } from '@/components/ui/AnimatedText';
import {
  ArrowRight, Clock, Shield,
  Smartphone, Tablet, Globe, Briefcase, UserCheck,
  MapPin, ClipboardList, Calendar, IndianRupee, Loader2, Star, Check,
  Zap,
  Network, Users,
  Twitter, Linkedin, Github, Youtube, Mail, Phone
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { plansService } from '@/services/plans.service';
import { cn } from '@/utils/cn';
import rolesVisual from '@/assets/hrms_roles.png';

const FeatureVisual: React.FC<{ feature: any; colorConfig: any }> = ({ feature, colorConfig }) => {

  return (
    <div className={cn(
      "relative z-10 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 h-full bg-gradient-to-br flex flex-col items-center justify-center p-4 transition-all duration-500 group-hover:bg-black/[0.05] dark:group-hover:bg-white/[0.05]",
      colorConfig.gradient
    )}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      {feature.id === 'core_hr' && (
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border border-dashed border-black/10 dark:border-white/10 rounded-full"
          />
          <div className="flex flex-col gap-3 items-center">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20"><Network size={20} className={colorConfig.text} /></div>
            <div className="flex gap-4">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-6 h-6 rounded-full bg-white/10 border border-white/20" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} className="w-6 h-6 rounded-full bg-white/10 border border-white/20" />
            </div>
          </div>
        </div>
      )}

      {feature.id === 'attendance' && (
        <div className="relative w-20 h-20">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-black/5 dark:text-white/5" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray="283"
              initial={{ strokeDashoffset: 283 }}
              whileInView={{ strokeDashoffset: 70 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn(colorConfig.text, "drop-shadow-sm")}
              style={{ strokeLinecap: 'round' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <ClipboardList size={22} className={cn("opacity-80", colorConfig.text)} />
          </div>
        </div>
      )}

      {feature.id === 'leave' && (
        <div className="grid grid-cols-4 gap-1.5 w-full max-w-[120px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-6 rounded-sm border border-black/5 dark:border-white/5",
                i === 5 || i === 9 ? colorConfig.glow : "bg-black/5 dark:bg-white/5"
              )}
            />
          ))}
        </div>
      )}

      {feature.id === 'payroll' && (
        <div className="relative flex flex-col items-center justify-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <IndianRupee size={52} className={colorConfig.text} />
          </motion.div>
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ scaleY: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, delay: i * 0.15, repeat: Infinity }}
                className={cn("w-2 h-6 rounded-full", colorConfig.glow, "opacity-40")}
              />
            ))}
          </div>
        </div>
      )}

      {feature.id === 'ess' && (
        <div className="relative flex items-center justify-center">
          <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
            <Smartphone size={42} className={cn("opacity-80", colorConfig.text)} />
          </div>
        </div>
      )}

      {feature.id === 'rbac' && (
        <div className="relative">
          <div className="p-5 bg-white/5 rounded-full border border-white/10">
            <Shield size={32} className={cn("opacity-80", colorConfig.text)} />
          </div>
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn("absolute inset-0 rounded-full border-2", colorConfig.text.replace('text', 'border'))}
          />
        </div>
      )}
    </div>
  );
};

const keyFeatures = [
  {
    id: 'core_hr',
    title: 'Core HR Management',
    icon: Users,
    color: 'emerald',
    points: [
      'Comprehensive employee directory',
      'Digital document repository per employee',
      'Define departments and organizational units',
      'Predefined system and custom roles'
    ],
    description: "Centrally manage your entire workforce data, documents, and organizational structure in a single, secure environment."
  },
  {
    id: 'attendance',
    title: 'Attendance Management',
    icon: Clock,
    color: 'blue',
    points: [
      'Digital check-in and check-out tracking',
      'Daily attendance logs for all employees',
      'Calculated work hours based on logs',
      'Monthly attendance reporting'
    ],
    description: "Track employee working hours and daily attendance records to maintain accurate operational data."
  },
  {
    id: 'leave',
    title: 'Leave Management',
    icon: Calendar,
    color: 'purple',
    points: [
      'Submit leave requests via portal',
      'Manager-level approval workflows',
      'Track real-time leave balances',
      'Detailed leave history and logs'
    ],
    description: "A structured system for employees to request time off and for managers to review and approve requests."
  },
  {
    id: 'payroll',
    title: 'Payroll Processing',
    icon: IndianRupee,
    color: 'amber',
    points: [
      'Configurable monthly salary structures',
      'Automatic payslip generation',
      'Handle allowances and deductions',
      'Downloadable PDF payslips'
    ],
    description: "Process monthly salaries accurately with defined structures, deductions, and allowances for your employees."
  },
  {
    id: 'ess',
    title: 'Employee Self-Service',
    icon: Smartphone,
    color: 'rose',
    points: [
      'Personal employee dashboards',
      'View and update profile information',
      'Access and download historical payslips',
      'Real-time leave status tracking'
    ],
    description: "Provide employees with a private portal to manage their information and access company documents independently."
  },
  {
    id: 'rbac',
    title: 'Access Control (RBAC)',
    icon: Shield,
    color: 'indigo',
    points: [
      'Define granular access permissions',
      'Role-based module visibility',
      'Secure data isolation per tenant',
      'Audit logs for administrative changes'
    ],
    description: "Ensure data security by assigning specific roles and permissions to users based on their responsibilities."
  }
];

const stats = [
  { label: 'Time spent on routine HR tasks', value: 'Reduction' },
  { label: 'Payroll cycle turnaround', value: 'Faster' },
  { label: 'Process accuracy', value: 'Consistent' },
];

const workflow = [
  {
    step: '01',
    title: 'Setup Your Organization',
    description: 'Create your multi-tenant account and configure departments and roles based on your structure.',
  },
  {
    step: '02',
    title: 'Onboard Employee Data',
    description: 'Add employees to the system with their documents and assign them to respective departments.',
  },
  {
    step: '03',
    title: 'Manage Operations',
    description: 'Start managing daily attendance, leave requests, and process monthly payroll with slips.',
  },
];

const testimonials = [
  {
    name: 'Business Administrator',
    role: 'Small Manufacturing Firm',
    avatarColor: 'bg-blue-500',
    quote: 'The system has helped us centralize our employee records and process monthly payroll without manual errors.',
  },
  {
    name: 'HR Operations Lead',
    role: 'Growing Infrastructure Company',
    avatarColor: 'bg-purple-500',
    quote: 'The employee portal makes it very easy for our staff to download their payslips and apply for leave independently.',
  },
];

const platforms = [
  { name: 'Web Browser', icon: Globe, description: 'Optimized for Desktop' },
  { name: 'Mobile Ready', icon: Smartphone, description: 'Responsive Portal' },
  { name: 'Tablet Compatible', icon: Tablet, description: 'Full Functionality' },
  { name: 'Secure Access', icon: Shield, description: 'Cloud Hosted' },
];

const roles = [
  {
    title: 'Super Admin',
    icon: Shield,
    description: 'Full control over organizational settings, tenant configuration, and administrative oversight.',
    features: ['Tenant Management', 'Role Definitions', 'System Settings'],
    color: 'from-purple-500/20 to-indigo-500/10'
  },
  {
    title: 'Manager',
    icon: Briefcase,
    description: 'Manage departmental operations including leave approvals and attendance monitoring.',
    features: ['Leave Approvals', 'Team Records', 'Attendance View'],
    color: 'from-amber-500/20 to-orange-500/10'
  },
  {
    title: 'Employee',
    icon: UserCheck,
    description: 'Self-service portal for personal record management, leave requests, and payslip access.',
    features: ['Profile Management', 'Leave Requests', 'Payslip Downloads'],
    color: 'from-emerald-500/20 to-teal-500/10'
  }
];



const planMeta: Record<string, {
  subtitle: string;
  tagline: string;
  highlights: string[];
  included: string;
}> = {
  STANDARD: {
    subtitle: 'Foundation',
    tagline: 'All core HR modules for small organizations beginning to digitize operations',
    highlights: [
      'Centralized Employee Directory',
      'Electronic Document Management',
      'Basic Attendance Logs',
      'Leave Management System',
      'Self-Service Portal Access',
      'User Profile Management',
      'Role-Based Visibility',
      'Email Notifications',
    ],
    included: 'Core modules for organizations up to 50 members',
  },
  PREMIUM: {
    subtitle: 'Business',
    tagline: 'Complete HR and payroll solution for growing organizations',
    highlights: [
      'All Standard features, plus:',
      'Full Payroll Processing',
      'Salary Structure Definition',
      'Payslip Generation & History',
      'Allowances & Deductions Management',
      'Advanced Reporting Logs',
      'Manager Approval Workflows',
      'Business Hours Phone Support',
    ],
    included: 'Full solution for organizations up to 250 members',
  },
  ELITE: {
    subtitle: 'Enterprise',
    tagline: 'Full feature set with highest user capacity and priority support',
    highlights: [
      'All Premium features, plus:',
      'Unlimited User Capacity',
      'Dedicated Instance Configuration',
      'Advanced Role Definitions',
      'Audit Logs & Compliance Data',
      'Custom Module Visibility',
      'Direct Account Manager',
      '24/7 Priority Support Access',
    ],
    included: 'Enterprise scaling for unlimited users',
  },
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [billingCycle, setBillingCycle] = React.useState<string>('MONTHLY');
  const [highlightedFeature, setHighlightedFeature] = React.useState<string | null>(null);

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['landing-plans'],
    queryFn: () => plansService.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
  const displayPlans = React.useMemo(() => {
    if (!Array.isArray(plansData)) return [];

    const targetPlans = plansData.filter(p => ['STANDARD', 'PREMIUM', 'ELITE'].includes(p.name));

    return targetPlans.map((plan) => {
      const isMiddlePlan = plan.name === 'PREMIUM';

      const durationMap: Record<string, number> = { 'MONTHLY': 1, 'QUARTERLY': 3, 'HALF_YEARLY': 6, 'YEARLY': 12 };
      const durationMonths = durationMap[billingCycle] || 1;

      let basePriceForCycle = 0;

      const exactPriceObj = plan.prices?.find((p: any) => p.interval === billingCycle);
      const monthlyPriceObj = plan.prices?.find((p: any) => p.interval === 'MONTHLY');

      if (exactPriceObj) {
        basePriceForCycle = Number(exactPriceObj.unit_amount);
      } else if (monthlyPriceObj) {
        basePriceForCycle = Number(monthlyPriceObj.unit_amount) * durationMonths;
      } else {
        basePriceForCycle = Number(plan.price) * durationMonths;
      }

      let setupFee = Number(plan.setup_fee);
      if (plan.name === 'STANDARD' && setupFee === 0) setupFee = 5000;

      const totalBeforeTax = basePriceForCycle; // quantity = 1 for simple display
      const monthlyEquivalent = basePriceForCycle / durationMonths;

      return {
        id: plan.id,
        name: plan.name,
        priceId: exactPriceObj?.id || monthlyPriceObj?.id,
        unitPrice: monthlyEquivalent.toFixed(2),
        setupFee: setupFee,
        totalBeforeTax: totalBeforeTax,
        period: billingCycle,
        duration: durationMonths,
        popular: isMiddlePlan,
      };
    });
  }, [plansData, billingCycle]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeature = (featureId: string) => {
    const el = document.getElementById(`feature-${featureId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedFeature(featureId);
      setTimeout(() => setHighlightedFeature(null), 2500);
    }
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white relative overflow-y-auto overflow-x-hidden transition-colors duration-300">

      {/* Background gradient overlay & Grid Pattern */}
      <div className="fixed inset-0 bg-gray-50/50 dark:bg-black/90 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

      {/* Futuristic Navigation - Floating Island */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
        <nav className="w-full max-w-5xl border border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-2xl rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all duration-300">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                whileHover={{ scale: 1.05 }}
              >
                <AnimatedLogo size="md" />
              </motion.div>

              <div className="hidden md:flex items-center gap-6">
                <Button variant="ghost" className="hover:bg-primary/10" onClick={scrollToFeatures}>
                  Features
                </Button>
                <Button variant="ghost" className="hover:bg-primary/10" onClick={scrollToPricing}>
                  Pricing
                </Button>
                <div className="h-6 w-px bg-white/10 mx-2" />
                <ThemeToggle />
                <Button variant="outline" className="border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => navigate('/pricing')}>
                  Register
                </Button>
                <Button variant="primary" className="shadow-lg shadow-primary/20" onClick={() => navigate('/login')}>
                  Login
                </Button>
              </div>

              <div className="md:hidden flex items-center gap-2">
                <ThemeToggle />
                <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pt-36 mb-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center space-y-10 mb-20"
        >
          <motion.div variants={fadeInUp} className="max-w-4xl">
            <motion.span
              variants={fadeInUp}
              className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-8"
            >
              Enterprise-Ready HR Management
            </motion.span>

            <AnimatedText
              variant="slide-up"
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-8 text-gray-900 dark:text-white"
            >
              Professional <span className="text-primary">HR & Payroll</span> for Growing Organizations.
            </AnimatedText>

            <AnimatedText
              variant="fade-in"
              delay={0.4}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Streamline your employee management, attendance tracking, and payroll processing in a single, secure multi-tenant platform. Built for reliability and ease of use.
            </AnimatedText>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-5 justify-center">
              <Button size="lg" className="rounded-xl px-8 py-5 text-base group" onClick={() => navigate('/pricing')}>
                Start 14-Day Free Trial <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl px-8 py-5 text-base border-gray-200 dark:border-white/10" onClick={() => window.location.href = '#about'}>
                About the Product
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <main className="max-w-7xl mx-auto px-6">
        {/* Platforms Section */}
        <section id="about" className="py-24 border-y border-gray-100 dark:border-white/5 mb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-2xl text-center md:text-left">
                <AnimatedText variant="slide-up" className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                  About <span className="text-primary">The Product</span>.
                </AnimatedText>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  WellZo HRMS is a multi-tenant web application designed to handle the core operational needs of small and mid-sized organizations. It provides a centralized dashboard to manage employee information, documents, attendance, and payroll processing, ensuring administrative consistency and data security for your business.
                </p>
              </div>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-8"
              >
                {platforms.map((p) => (
                  <motion.div
                    key={p.name}
                    variants={fadeInUp}
                    whileHover={{ y: -5, borderColor: 'rgba(var(--primary), 0.5)' }}
                    className="flex flex-col items-center p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-colors"
                  >
                    <p.icon className="text-primary mb-3" size={32} />
                    <span className="font-semibold text-sm">{p.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted mt-1">{p.description}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Who It Is For Section */}
        <section className="mb-24">
          <div className="text-center mb-20">
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block">Tailored for Small & Mid-Sized Organizations</motion.span>
            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-900 dark:text-white">Who It Is <span className="text-primary">For</span>.</AnimatedText>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Built specifically for Indian SMEs and growing businesses that require a professional system to manage their workforce beyond spreadsheets.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl overflow-hidden shadow-2xl"
            >
              <img src={rolesVisual} alt="Roles in HRMS" className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="space-y-8"
            >
              {roles.map((role) => (
                <motion.div
                  key={role.title}
                  variants={fadeInUp}
                  className={cn(
                    "p-8 rounded-3xl border border-black/5 dark:border-white/10 bg-gradient-to-r group hover:scale-[1.02] transition-all cursor-default",
                    role.color
                  )}
                >
                  <div className="flex items-start gap-5">
                    <div className="p-4 rounded-2xl bg-white dark:bg-black/50 shadow-lg group-hover:scale-110 transition-transform">
                      <role.icon className="text-primary" size={28} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold mb-2">{role.title}</h4>
                      <p className="text-gray-600 dark:text-muted/80 text-sm mb-4 leading-relaxed">
                        {role.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {role.features.map(f => (
                          <span key={f} className="text-[10px] px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 font-medium">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mb-24">
          <div className="text-center mb-16">
            <motion.span
              variants={fadeInUp}
              className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block"
            >
              Product Modules
            </motion.span>
            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-900 dark:text-white">
              Essential <span className="text-primary">Features</span>.
            </AnimatedText>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              A comprehensive set of tools designed to manage your HR operations efficiently.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(300px,_auto)]"
          >
            {keyFeatures.map((feature) => {
              const Icon = feature.icon;
              const isLarge = (feature as any).isLarge === undefined
                ? (feature.id === 'core_hr' || feature.id === 'payroll')
                : (feature as any).isLarge;

              const colorConfig = {
                emerald: { text: 'text-emerald-500', dot: 'bg-emerald-500/40', glow: 'bg-emerald-500', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent' },
                blue: { text: 'text-blue-500', dot: 'bg-blue-500/40', glow: 'bg-blue-500', gradient: 'from-blue-500/20 via-blue-500/5 to-transparent' },
                purple: { text: 'text-purple-500', dot: 'bg-purple-500/40', glow: 'bg-purple-500', gradient: 'from-purple-500/20 via-purple-500/5 to-transparent' },
                amber: { text: 'text-amber-500', dot: 'bg-amber-500/40', glow: 'bg-amber-500', gradient: 'from-amber-500/20 via-amber-500/5 to-transparent' },
                rose: { text: 'text-rose-500', dot: 'bg-rose-500/40', glow: 'bg-rose-500', gradient: 'from-rose-500/20 via-rose-500/5 to-transparent' },
                indigo: { text: 'text-indigo-500', dot: 'bg-indigo-500/40', glow: 'bg-indigo-500', gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent' },
                slate: { text: 'text-slate-500', dot: 'bg-slate-500/40', glow: 'bg-slate-500', gradient: 'from-slate-500/20 via-slate-500/5 to-transparent' },
              }[feature.color as string] || { text: 'text-primary', dot: 'bg-primary/40', glow: 'bg-primary', gradient: 'from-primary/20 via-primary/5 to-transparent' };

              return (
                <motion.div
                  key={feature.id}
                  id={`feature-${feature.id}`}
                  variants={fadeInUp}
                  className={cn(
                    "relative group rounded-[1.5rem] overflow-hidden border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.02] backdrop-blur-xl transition-all duration-500 hover:border-black/10 dark:hover:border-white/20 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                    isLarge ? "md:col-span-2" : "col-span-1",
                    highlightedFeature === feature.id && "ring-2 ring-primary ring-offset-2 ring-offset-light-bg dark:ring-offset-dark-bg scale-[1.02] shadow-[0_0_40px_rgba(var(--primary),0.15)]"
                  )}
                >
                  <div className="p-5 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "p-2 rounded-xl bg-black/5 dark:bg-white/5 shadow-inner group-hover:scale-110 transition-transform duration-500",
                        colorConfig.text
                      )}>
                        <Icon size={18} />
                      </div>
                      <h3 className="text-base font-bold tracking-tight">{feature.title}</h3>
                    </div>

                    <div className={cn(
                      "flex flex-col gap-6 h-full",
                      isLarge ? "lg:flex-row" : ""
                    )}>
                      <div className="flex-1 space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                          {feature.description}
                        </p>
                        <div className="space-y-3">
                          {feature.points.map((point: string, pIdx: number) => (
                            <div key={pIdx} className="flex gap-3 text-gray-700 dark:text-muted/90 leading-relaxed group-hover:text-black dark:group-hover:text-white transition-colors duration-300">
                              <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 opacity-60", colorConfig.dot)} />
                              <p className="text-sm font-medium">{point}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={cn(
                        "flex-1 relative mt-2",
                        isLarge ? "lg:mt-0 lg:max-w-[45%]" : "h-40"
                      )}>
                        <FeatureVisual feature={feature} colorConfig={colorConfig} />
                        <div className={cn(
                          "absolute -inset-4 blur-3xl opacity-20 -z-10",
                          colorConfig.glow
                        )} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Why Choose This HRMS Section */}
        <section className="grid lg:grid-cols-2 gap-20 mb-24">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase block">Why Choose WellZo</motion.span>
            <AnimatedText variant="slide-up" className="text-4xl font-extrabold mb-8 leading-tight text-gray-900 dark:text-white">
              Built for <span className="text-primary">Reliable HR Operations</span>.
            </AnimatedText>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="space-y-6"
            >
              {workflow.map((item) => (
                <motion.div
                  key={item.step}
                  variants={fadeInUp}
                  className="flex gap-6 p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-white/50 dark:bg-black/20 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Card className="p-8 border-gray-100 dark:border-white/10 glass-effect h-full">
              <span className="text-xs uppercase text-primary font-bold tracking-widest block mb-2">Operational Benefits</span>
              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                Maintain accountability and process clarity across your team.
              </h3>

              <div className="grid grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <p className="text-3xl font-extrabold text-primary mb-1">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Centralized database for all employee information",
                  "Unified management of attendance, leave, and payroll",
                  "Secure document storage and role-based access",
                  "Employee self-service to reduce administrative overhead"
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {item}
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-white/10 pt-6 mt-auto">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
                  WellZo provides the operational structure needed for growing teams to manage HR functions professionally and securely.
                </p>
              </div>
            </Card>
          </motion.div>
        </section>


        {/* Pricing Introduction Section */}
        <div id="pricing" className="mb-24 pt-20">
          <div className="text-center mb-16">
            <motion.span
              variants={fadeInUp}
              className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block"
            >
              Subscription Plans
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-gray-900 dark:text-white leading-tight">
              Flexible <span className="text-primary">SaaS Plans</span> for Your Business.
            </h2>

            {/* Billing Toggle - Horizon Style */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={cn(
                    "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-widest",
                    billingCycle === 'MONTHLY'
                      ? "bg-white dark:bg-primary text-black dark:text-white shadow-xl"
                      : "text-gray-500 hover:text-gray-900 dark:text-muted dark:hover:text-white"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('YEARLY')}
                  className={cn(
                    "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-widest flex items-center gap-2",
                    billingCycle === 'YEARLY'
                      ? "bg-white dark:bg-primary text-black dark:text-white shadow-xl"
                      : "text-gray-500 hover:text-gray-900 dark:text-muted dark:hover:text-white"
                  )}
                >
                  Annual
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/20">
                    -20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col justify-center items-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-gray-500 dark:text-gray-400 font-medium tracking-widest uppercase text-xs">Accessing Latest Pricing</span>
            </div>
          )}

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4"
          >
            {!isLoading && displayPlans.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-muted/60 font-bold uppercase tracking-widest text-sm">No Active Plans Found</p>
                <p className="text-[10px] text-muted/30 mt-2">Check database table permissions or is_active flags.</p>
              </div>
            )}
            {displayPlans.map((plan, index) => {
              const meta = planMeta[plan.name] || { subtitle: '', tagline: '', highlights: [], included: '' };
              const iconColor = "text-primary dark:text-primary/90";
              const checkColor = "text-primary";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12, duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    "group relative flex flex-col rounded-[2.5rem] border transition-all duration-500",
                    plan.popular
                      ? "bg-white dark:bg-[#0a0a0a] border-primary/40 shadow-2xl dark:shadow-[0_0_60px_rgba(var(--primary),0.06)] scale-[1.02]"
                      : "bg-white dark:bg-[#080808] border-gray-200 dark:border-white/5 shadow-lg dark:shadow-none hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.02)]"
                  )}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                  )}
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-primary text-white dark:text-black text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-xl shadow-primary/30">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="p-6 pb-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">{plan.name}</h3>
                          <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-primary/20 text-primary bg-primary/5")}>
                            {meta.subtitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium leading-relaxed max-w-[200px]">
                          {meta.tagline}
                        </p>
                      </div>
                      <div className={cn("p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5", iconColor)}>
                        {plan.name === 'STANDARD' && <Star size={20} />}
                        {plan.name === 'PREMIUM' && <Zap size={20} />}
                        {plan.name === 'ELITE' && <Shield size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Price Section - Highlighted Billed Amount */}
                  <div className="px-6 py-6 mx-4 my-2 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <div className="flex flex-col">
                      <div className="flex flex-col gap-1 mb-4">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Billed Periodically</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                            ₹{plan.totalBeforeTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            / {plan.duration} mo{plan.duration > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200/50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Rate Breakdown</p>
                          <p className="text-[11px] font-bold text-gray-900 dark:text-white">
                            ₹{parseFloat(plan.unitPrice).toLocaleString()} <span className="text-[9px] text-gray-400 font-bold lowercase">per user / mo</span>
                          </p>
                        </div>

                        {plan.setupFee > 0 && (
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.15em]">One-Time</p>
                            <p className="text-[11px] font-bold text-gray-900 dark:text-white">₹{plan.setupFee.toLocaleString()} <span className="text-[9px] text-gray-400 uppercase font-bold">setup</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  <div className="p-6 pt-4 flex-1">
                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">What&apos;s included</p>
                    <div className="space-y-2.5">
                      {meta.highlights.map((feature: string, i: number) => {
                        const isInheritLine = feature.includes('Everything in');
                        return (
                          <div key={i} className={cn("flex items-start gap-2.5", isInheritLine && "mb-1")}>
                            {isInheritLine ? (
                              <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-2.5 h-2.5 text-gray-400" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary/10")}>
                                <Check className={cn("w-2.5 h-2.5", checkColor)} strokeWidth={3} />
                              </div>
                            )}
                            <span className={cn(
                              "text-[11px] font-medium leading-snug",
                              isInheritLine
                                ? "text-gray-400 dark:text-gray-500 italic"
                                : "text-gray-700 dark:text-gray-300"
                            )}>
                              {feature}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Included Badge + CTA */}
                  <div className="p-6 pt-0">
                    <div className="mb-4 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                      <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-center">
                        {meta.included}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/pricing')}
                      className={cn(
                        "w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                        "bg-primary text-white hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
                      )}
                    >
                      {plan.name === 'ELITE' ? 'Go Enterprise' : plan.name === 'PREMIUM' ? 'Start Growing' : 'Get Started'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Security Section */}
        <section id="security" className="mb-24 py-20 bg-gray-50 dark:bg-white/[0.02] rounded-[3rem] border border-gray-100 dark:border-white/5 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex p-4 rounded-2xl bg-primary/10 mb-8"
            >
              <Shield className="text-primary" size={32} />
            </motion.div>
            <AnimatedText variant="slide-up" className="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white leading-tight">
              Enterprise-Grade <span className="text-primary">Data Security</span>.
            </AnimatedText>
            <div className="grid md:grid-cols-2 gap-10 text-left">
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Data Privacy & Isolation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Our multi-tenant architecture ensures that your organization's data is strictly isolated and stored in a secure environment, protecting it from unauthorized access.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Reliable Access Control</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Role-based access control (RBAC) allows you to define exactly what each user can see and do, ensuring sensitive employee information remains protected.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
            <Shield size={200} className="text-primary" />
          </div>
        </section>

        {/* Final Call to Action */}
        <section id="final-cta" className="rounded-[3rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 p-12 md:p-20 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto">
            <AnimatedText variant="slide-up" className="text-4xl md:text-6xl font-extrabold mb-8 leading-tight text-gray-900 dark:text-white">
              Start Managing Your <span className="text-primary">Workforce</span> Effectively.
            </AnimatedText>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
              Join organizations using WellZo to bring structure to their HR and payroll operations.
              Our 14-day free trial gives you full access to all system features.
            </p>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-5 justify-center"
            >
              <motion.div variants={fadeInUp}>
                <Button size="lg" className="rounded-xl px-10 py-6 text-lg" onClick={() => navigate('/pricing')}>
                  Get Started Now
                </Button>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <Button variant="outline" size="lg" className="rounded-xl px-10 py-6 text-lg" onClick={scrollToPricing}>
                  View Pricing
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials (Customer Observations) */}
        <section className="mt-24 mb-24">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
              Customer Feedback
            </motion.span>
            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-900 dark:text-white">
              Trusted by <span className="text-primary">Growing Teams</span>.
            </AnimatedText>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-8"
          >
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.name}
                variants={fadeInUp}
              >
                <Card hover className="h-full border-white/10 glass-effect p-8 flex flex-col justify-between">
                  <p className="text-lg text-gray-600 dark:text-muted/90 italic mb-8 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-xl",
                      testimonial.avatarColor || "bg-primary"
                    )}>
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{testimonial.name}</p>
                      <p className="text-sm text-primary font-medium">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t border-light-border dark:border-dark-border bg-gradient-to-b from-transparent via-primary/[0.03] to-primary/[0.05] backdrop-blur-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

        <div className="max-w-[90rem] mx-auto px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-10">
              <div
                className="flex items-center gap-5 cursor-pointer group/footer-logo w-fit"
                onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <div className="relative">
                  <AnimatedLogo size="lg" />
                  <div className="absolute -inset-2 bg-primary/20 blur-xl opacity-0 group-hover/footer-logo:opacity-100 transition-opacity duration-500 -z-10" />
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white leading-none group-hover/footer-logo:text-primary transition-colors">
                    GIGGLE<span className="text-primary group-hover/footer-logo:text-primary">ZEN</span>
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mt-1 leading-none">Technologies</p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-gray-600 dark:text-muted/80 leading-relaxed text-base max-w-sm font-medium">
                  Engineering the next generation of workforce management. Empowering global teams with intelligent automation, real-time collaboration, and data-driven insights.
                </p>

                <div className="flex gap-4">
                  {[
                    { icon: Linkedin, href: 'https://linkedin.com/company/WellZo' },
                    { icon: Twitter, href: 'https://twitter.com/WellZo' },
                    { icon: Github, href: 'https://github.com/WellZo' },
                    { icon: Youtube, href: 'https://youtube.com/@WellZo' }
                  ].map((social, i) => (
                    <motion.a
                      key={i}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ y: -4, scale: 1.1 }}
                      className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-muted hover:text-primary hover:border-primary/30 transition-all duration-300"
                    >
                      <social.icon size={18} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Links */}
            <div className="lg:col-span-2">
              <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-8 text-gray-900 dark:text-white/90">Solution</h4>
              <ul className="space-y-4">
                {[
                  { label: 'Employee Records', featureId: 'core_hr' },
                  { label: 'Attendance Management', featureId: 'attendance' },
                  { label: 'Leave & Absence', featureId: 'leave' },
                  { label: 'Payroll Processing', featureId: 'payroll' },
                  { label: 'Self-Service Portal', featureId: 'ess' },
                  { label: 'Security & RBAC', featureId: 'rbac' }
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => scrollToFeature(link.featureId)}
                      className="text-sm text-gray-600 dark:text-muted/70 hover:text-primary transition-all flex items-center group font-medium"
                    >
                      <ArrowRight size={14} className="mr-0 w-0 opacity-0 group-hover:mr-2 group-hover:w-3 group-hover:opacity-100 transition-all duration-300" />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div className="lg:col-span-2">
              <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-8 text-gray-900 dark:text-white/90">Company</h4>
              <ul className="space-y-4">
                {['About Us', 'Success Stories', 'Platform Updates', 'Partner Program', 'Security Trust', 'Career'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-gray-600 dark:text-muted/70 hover:text-primary transition-all flex items-center group font-medium">
                      <ArrowRight size={14} className="mr-0 w-0 opacity-0 group-hover:mr-2 group-hover:w-3 group-hover:opacity-100 transition-all duration-300" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-4 lg:pl-12">
              <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-8 text-gray-900 dark:text-white/90">Get in Touch</h4>
              <ul className="space-y-8">
                <li>
                  <a href="mailto:support@WellZo.com" className="flex items-center gap-4 group">
                    <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-0.5 opacity-60">Email Us</p>
                      <p className="text-base text-gray-900 dark:text-white/90 font-semibold group-hover:text-primary transition-colors">info@WellZo.com</p>
                    </div>
                  </a>
                </li>
                <li>
                  <div className="flex items-center gap-4 group">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-sm">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-0.5 opacity-60">Call Sales</p>
                      <p className="text-base text-gray-900 dark:text-white/90 font-semibold">+91 7842238773</p>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-4 group">
                    <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-orange-500 tracking-widest uppercase mb-0.5 opacity-60">Corporate HQ</p>
                      <p className="text-base text-gray-900 dark:text-white/90 font-semibold">2nd Floor, 100 Feet Road, Madhapur, Hyderabad, 500081</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-light-border dark:border-dark-border flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-500 dark:text-muted/60 font-medium tracking-wide">
                &copy; {new Date().getFullYear()} WellZo Technologies Pvt Ltd.
              </p>
              <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-primary/20" />
              <p className="hidden md:block text-[10px] text-primary font-bold uppercase tracking-widest opacity-40">Made with Precision</p>
            </div>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-8">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
                  <a key={link} href="#" className="text-xs text-gray-500 dark:text-muted hover:text-primary transition-all font-semibold border-b border-transparent hover:border-primary/30 pb-0.5">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
