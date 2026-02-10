import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AnimatedText } from '@/components/ui/AnimatedText';
import {
  ArrowRight, Clock, Shield,
  Smartphone, Tablet, Globe, LayoutDashboard, Briefcase, UserCheck,
  MapPin, Columns, ClipboardList, Calendar, DollarSign, Loader2, Star, Check
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { plansService, Plan } from '@/services/plans.service';
import { cn } from '@/utils/cn';

const FeatureVisual: React.FC<{ feature: any; colorConfig: any }> = ({ feature, colorConfig }) => {
  const Icon = feature.icon;

  if (feature.image) {
    return (
      <motion.div
        whileHover={{ scale: 1.05, rotate: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="relative z-10 rounded-xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/10 h-full"
      >
        <img
          src={feature.image}
          alt={feature.title}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
      </motion.div>
    );
  }

  return (
    <div className={cn(
      "relative z-10 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 h-full bg-gradient-to-br flex flex-col items-center justify-center p-4 transition-all duration-500 group-hover:bg-black/[0.05] dark:group-hover:bg-white/[0.05]",
      colorConfig.gradient
    )}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      {feature.id === 'timesheets' && (
        <div className="w-full space-y-3 px-2">
          {[80, 45, 90].map((w, i) => (
            <div key={i} className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${w}%` }}
                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                className={cn("h-full shadow-[0_0_8px_rgba(0,0,0,0.1)]", colorConfig.glow)}
              />
            </div>
          ))}
          <div className="flex justify-between items-center mt-2 opacity-40">
            <Clock size={16} className={colorConfig.text} />
            <div className="text-[9px] font-mono tracking-tighter font-semibold opacity-60">09:00 - 18:00</div>
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
              initial={{ opacity: 0.2 }}
              whileInView={{ opacity: [0.2, 0.5, 0.2][i % 3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              className={cn(
                "h-6 rounded-sm border border-black/5 dark:border-white/5",
                i === 5 || i === 9 ? colorConfig.glow : "bg-black/5 dark:bg-white/5"
              )}
            />
          ))}
        </div>
      )}

      {feature.id === 'security' && (
        <div className="relative">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.05, 1]
            }}
            transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
            className="w-24 h-24 border-2 border-dashed border-black/10 dark:border-white/10 rounded-full flex items-center justify-center"
          >
            <div className="w-20 h-20 border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Shield size={32} className={cn("opacity-60 animate-pulse", colorConfig.text)} />
            </div>
          </motion.div>
          {[0, 90, 180, 270].map((deg) => (
            <motion.div
              key={deg}
              className={cn("absolute w-2 h-2 rounded-full shadow-sm", colorConfig.glow)}
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${deg}deg) translate(48px) rotate(-${deg}deg)`
              }}
            />
          ))}
        </div>
      )}

      {!['timesheets', 'attendance', 'leave', 'security'].includes(feature.id) && (
        <Icon size={52} className={cn("relative z-20 opacity-40 group-hover:opacity-90 transition-opacity duration-500", colorConfig.text)} />
      )}

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.35, 0.15]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={cn("absolute inset-0 blur-3xl", colorConfig.glow)}
      />
    </div>
  );
};

// Assets
import rolesVisual from '@/assets/hrms_roles.png';
import geofencingVisual from '@/assets/geofencing_visual.png';
import kanbanVisual from '@/assets/kanban_visual.png';
import payrollVisual from '@/assets/payroll_visual.png';

const keyFeatures = [
  {
    id: 'geofencing',
    title: 'Geo-Fencing Attendance',
    icon: MapPin,
    image: geofencingVisual,
    color: 'emerald',
    points: [
      'Location-based check-in and check-out',
      'Prevents attendance fraud with real-time geo validation',
      'Configurable office and site boundaries',
      'Accurate tracking for on-site and remote teams'
    ],
    description: "Ensure your team is exactly where they need to be. Define virtual perimeters for office locations and client sites to automate attendance accuracy with precision."
  },
  {
    id: 'timesheets',
    title: 'Smart Timesheets',
    icon: Clock,
    color: 'blue',
    points: [
      'Easy daily and weekly time logging',
      'Project and task-wise hour tracking',
      'Manager approvals with audit history',
      'Improves productivity and billing accuracy'
    ],
    description: "Streamline time tracking with intuitive, automated logging that captures every billable hour without the manual hassle, ensuring transparency and efficiency."
  },
  {
    id: 'kanban',
    title: 'Kanban Boards',
    icon: Columns,
    image: kanbanVisual,
    color: 'purple',
    points: [
      'Visual task management with drag-and-drop workflow',
      'Customizable stages for teams and projects',
      'Real-time status updates and collaboration',
      'Improves transparency and delivery timelines'
    ],
    description: "Visualize workflows and boost team collaboration with intuitive boards that keep every project moving forward, giving you a clear view of progress at a glance."
  },
  {
    id: 'attendance',
    title: 'Attendance Management',
    icon: ClipboardList,
    color: 'amber',
    points: [
      'Automated attendance calculation',
      'Late, early, and overtime tracking',
      'Daily, monthly, and custom reports',
      'Seamless integration with payroll'
    ],
    description: "Goodbye manual registers. Capture clock-ins, breaks, and overtime with precision-engineered automated tracking that integrates seamlessly with your payroll."
  },
  {
    id: 'leave',
    title: 'Leave Management',
    icon: Calendar,
    color: 'rose',
    points: [
      'Online leave requests and approvals',
      'Multiple leave types (CL, SL, PL, WFH, etc.)',
      'Holiday calendar and leave balance tracking',
      'Policy-based automation for accuracy'
    ],
    description: "Simplify time-off management with a transparent, policy-driven system that handles requests, approvals, and balances instantly, keeping everyone in sync."
  },
  {
    id: 'payroll',
    title: 'Payroll Management',
    icon: DollarSign,
    image: payrollVisual,
    color: 'indigo',
    points: [
      'Automated salary calculation',
      'Attendance and leave-based payroll processing',
      'Statutory deductions and compliance ready',
      'Payslip generation and salary reports'
    ],
    description: "Run error-free payroll in minutes. Automatically syncs with attendance and leave data for perfect payouts every time, ensuring your team is paid correctly and on time."
  },
  {
    id: 'security',
    title: 'Secure & Scalable',
    icon: Shield,
    color: 'slate',
    points: [
      'Role-based access control',
      'Secure data handling and storage',
      'Scalable for startups to large enterprises',
      'Cloud-ready architecture'
    ],
    description: "Enterprise-grade protection for your most sensitive data, ensuring full compliance and peace of mind at every scale with role-based access control."
  }
];

const stats = [
  { label: 'Reduction in HR Ops time', value: '40%' },
  { label: 'Faster payroll processing', value: '3x' },
  { label: 'Less manual errors', value: '60%' },
];

const workflow = [
  {
    step: '01',
    title: 'Onboard your team',
    description: 'Import employees in bulk or add them in seconds. Set locations, departments, and managers.',
  },
  {
    step: '02',
    title: 'Automate HR operations',
    description: 'Let workflows handle attendance, leave, and approvals with minimal manual intervention.',
  },
  {
    step: '03',
    title: 'Run payroll in hours',
    description: 'Pull attendance, compute payouts, and generate payslips with a single flow.',
  },
];

const testimonials = [
  {
    name: 'Ananya Sharma',
    role: 'Head of People, Fintech Co.',
    avatarColor: 'bg-blue-500',
    quote:
      'WellZo HRMS helped us centralize attendance, leave, and payroll. Our HR team finally has time for people, not paperwork.',
  },
  {
    name: 'Rahul Verma',
    role: 'HR Manager, SaaS Startup',
    avatarColor: 'bg-purple-500',
    quote:
      'The dashboard gives me real-time visibility into headcount, leaves, and payroll. No more juggling spreadsheets.',
  },
];

const platforms = [
  { name: 'Web Browser', icon: Globe, description: 'Chrome, Safari, Firefox' },
  { name: 'Mobile App', icon: Smartphone, description: 'iOS & Android' },
  { name: 'Tablet View', icon: Tablet, description: 'Optimized Experience' },
  { name: 'Desktop App', icon: LayoutDashboard, description: 'Windows & macOS' },
];

const roles = [
  {
    title: 'Admin',
    icon: Shield,
    description: 'Complete control over organization settings, payroll configuration, and high-level reports.',
    features: ['System Configuration', 'Role Management', 'Advanced Analytics'],
    color: 'from-purple-500/20 to-indigo-500/10'
  },
  {
    title: 'Manager',
    icon: Briefcase,
    description: 'Efficiently manage team attendance, approve leave requests, and track project progress.',
    features: ['Team Monitoring', 'Approval Workflows', 'Performance Tracking'],
    color: 'from-amber-500/20 to-orange-500/10'
  },
  {
    title: 'Employee',
    icon: UserCheck,
    description: 'Easy-to-use self-service portal for clocking in, requesting leave, and viewing payslips.',
    features: ['Self Service', 'Leave Requests', 'Document Access'],
    color: 'from-emerald-500/20 to-teal-500/10'
  }
];

// featureKeys and formatFeatureLabel removed (unused)


const categoryLabels: Record<string, string> = {
  dashboard: 'Core HR & Dashboards',
  collaboration: 'Collaboration Tools',
  employee_management: 'Employee Management',
  leave_tracker: 'Leave & Time Off',
  attendance_tracker: 'Attendance Tracking',
  project_management: 'Project & Workspace',
  asset_management: 'Asset Management',
  employee_activity_monitoring: 'Activity Monitoring',
  automation: 'Workflow Automation',
  performance_management: 'Performance Management',
  payroll_automation: 'Payroll Automation',
  mobile_application: 'Mobile Solutions',
  other_features: 'Additional Capabilities',
};

// Helper to count enabled features in a plan for landing page display
const countEnabledFeatures = (features: Record<string, any>): string[] => {
  const enabledList: string[] = [];

  if (!features || typeof features !== 'object') return [];

  Object.entries(features).forEach(([category, value]) => {
    if (category === 'contact_sales') return;

    if (typeof value === 'object' && value !== null) {
      const enabledCount = Object.values(value).filter(Boolean).length;
      if (enabledCount > 0) {
        const label = categoryLabels[category] || category.replace(/_/g, ' ');
        enabledList.push(label);
      }
    }
  });

  return enabledList;
};

// Map database plan to display format
const mapPlanToDisplay = (plan: Plan, index: number, totalPlans: number, billingCycle: 'monthly' | 'annual') => {
  const isCustom = plan.name === 'CUSTOM' || plan.price === 0;
  const isMiddlePlan = index === Math.floor(totalPlans / 2);

  // Apply 20% discount for annual billing
  let price = plan.price;
  if (!isCustom && billingCycle === 'annual') {
    price = Math.round(plan.price * 0.8);
  }

  return {
    id: plan.id,
    name: plan.name,
    price: isCustom ? 'Custom' : price,
    period: isCustom ? '' : billingCycle === 'monthly' ? 'mth' : 'yr',
    description: plan.max_employees
      ? `Up to ${plan.max_employees} employees`
      : 'Unlimited employees',
    features: countEnabledFeatures(plan.features),
    popular: isMiddlePlan && !isCustom,
    glow: isMiddlePlan && !isCustom
      ? 'shadow-[0_0_50px_rgba(37,99,235,0.1)] group-hover:shadow-[0_0_60px_rgba(37,99,235,0.15)]'
      : 'group-hover:shadow-[0_0_40px_rgba(0,0,0,0.02)]',
    rawPlan: plan // Keep reference for table comparison
  };
};

export const LandingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('monthly');

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['landing-plans'],
    queryFn: () => plansService.getPlans(),
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    console.log('Landing plansData:', plansData);
  }, [plansData]);

  const displayPlans = Array.isArray(plansData)
    ? plansData.map((plan, index) => mapPlanToDisplay(plan, index, plansData.length, billingCycle))
    : [];

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

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white relative overflow-y-auto overflow-x-hidden transition-colors duration-300">

      {/* Background GZ Big Text */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -10, 0],
            x: [0, 5, 0]
          }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 2 },
            y: { duration: 15, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 20, repeat: Infinity, ease: "easeInOut" }
          }}
          className="text-[28rem] md:text-[40rem] font-semibold tracking-tighter leading-none text-black/[0.03] dark:text-white/[0.03] opacity-100"
        >
          GZ
        </motion.span>
      </div>

      {/* Background gradient overlay & Grid Pattern */}
      <div className="fixed inset-0 bg-gradient-radial opacity-30 dark:opacity-90 pointer-events-none z-0" />
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
              The Modern Workforce Ecosystem
            </motion.span>

            <AnimatedText
              variant="slide-up"
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-8"
            >
              Master Your <span className="text-gradient">HR Operations</span> with Elegance.
            </AnimatedText>

            <AnimatedText
              variant="fade-in"
              delay={0.4}
              className="text-xl text-gray-600 dark:text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              WellZo is the definitive all-in-one platform for high-performance teams.
              Automate the mundane, empower your people, and scale with confidence.
            </AnimatedText>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-5 justify-center">
              <Button size="lg" className="rounded-xl px-8 py-5 text-base group" onClick={() => navigate('/pricing')}>
                Begin Your Journey <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl px-8 py-5 text-base" onClick={scrollToFeatures}>
                Explore Capabilities
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <main className="max-w-7xl mx-auto px-6">
        {/* Platforms Section */}
        <section className="py-24 border-y border-light-border dark:border-dark-border mb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-md text-center md:text-left">
                <AnimatedText variant="slide-up" className="text-3xl font-bold mb-4">
                  Truly <span className="text-gradient">Omnichannel</span>.
                </AnimatedText>
                <p className="text-gray-600 dark:text-muted">
                  Seamlessly transition between devices. Your workforce doesn&apos;t wait, and neither does WellZo.
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

        {/* HRMS Ecosystem & Roles Section */}
        <section className="mb-24">
          <div className="text-center mb-20">
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block">Tailored Experience</motion.span>
            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6">Built for Every <span className="text-gradient">Role</span>.</AnimatedText>
            <p className="text-gray-600 dark:text-muted max-w-2xl mx-auto">
              Whether you&apos;re steering the ship, leading a team, or driving innovation,
              WellZo adapts to your specific needs.
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
              Powerful Capabilities
            </motion.span>
            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6">
              Empower Your <span className="text-gradient">HR Engine</span>.
            </AnimatedText>
            <p className="text-gray-600 dark:text-muted text-lg max-w-2xl mx-auto">
              A comprehensive suite of tools engineered to transform manual overhead into strategic advantage.
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
              const isLarge = feature.id === 'geofencing' || feature.id === 'payroll';

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
                  variants={fadeInUp}
                  className={cn(
                    "relative group rounded-[2rem] overflow-hidden border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.02] backdrop-blur-xl transition-all duration-500 hover:border-black/10 dark:hover:border-white/20 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                    isLarge ? "md:col-span-2" : "col-span-1"
                  )}
                >
                  <div className="p-8 h-full flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn(
                        "p-3 rounded-xl bg-black/5 dark:bg-white/5 shadow-inner group-hover:scale-110 transition-transform duration-500",
                        colorConfig.text
                      )}>
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                    </div>

                    <div className={cn(
                      "flex flex-col gap-6 h-full",
                      isLarge ? "lg:flex-row" : ""
                    )}>
                      <div className="flex-1 space-y-4">
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                          {feature.description}
                        </p>
                        <div className="space-y-3">
                          {feature.points.map((point, pIdx) => (
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

        {/* Workflow & Stats */}
        <section className="grid lg:grid-cols-2 gap-20 mb-24">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase block">Operational Excellence</motion.span>
            <AnimatedText variant="slide-up" className="text-4xl font-extrabold mb-8 leading-tight">
              Go Live in Three <span className="text-gradient">Simple Phases</span>.
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
                  className="flex gap-6 p-6 rounded-3xl border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                    <p className="text-gray-600 dark:text-muted leading-relaxed">{item.description}</p>
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
            <Card className="p-8 border-black/5 dark:border-white/10 glass-effect h-full">
              <span className="text-xs uppercase text-primary font-bold tracking-widest block mb-2">ROI & Outcomes</span>
              <h3 className="text-2xl font-bold mb-6 text-gradient">
                Designed for HR teams that do more with less.
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
                    <p className="text-[10px] uppercase tracking-wider text-muted font-medium">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Eliminate 90% of paperwork with automated workflows",
                  "Unified data source for payroll and compliance",
                  "Real-time visibility into workforce distribution",
                  "Seamless self-service for improved employee satisfaction"
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-muted/90"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {item}
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 mt-auto">
                <p className="text-xs text-muted/60 leading-relaxed italic">
                  WellZo empowers high-growth teams to scale without the administrative drag,
                  ensuring your HR strategy remains focused on people, not spreadsheets.
                </p>
              </div>
            </Card>
          </motion.div>
        </section>


        {/* Pricing Section */}
        <div id="pricing" className="mb-24 pt-20">
          <div className="text-center mb-16">
            <motion.span
              variants={fadeInUp}
              className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block"
            >
              Subscription Plans
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-[#101828] dark:text-white leading-tight">
              Ready to <span className="text-gradient">Scale</span> Your Business?
            </h2>

            {/* Billing Toggle - Horizon Style */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-widest",
                    billingCycle === 'monthly'
                      ? "bg-white dark:bg-primary text-black dark:text-white shadow-xl"
                      : "text-gray-500 hover:text-gray-900 dark:text-muted dark:hover:text-white"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={cn(
                    "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-widest flex items-center gap-2",
                    billingCycle === 'annual'
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
              <span className="text-muted/60 font-medium tracking-widest uppercase text-xs">Synchronizing Plans</span>
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
            {displayPlans.map((plan: any) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={cn(
                  "group relative rounded-[2.5rem] p-8 transition-all duration-500 overflow-hidden border",
                  plan.popular
                    ? "bg-black/[0.03] dark:bg-white/[0.03] border-primary/30 shadow-[0_0_50px_rgba(var(--primary),0.05)] scale-105 z-10"
                    : "bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 backdrop-blur-sm"
                )}
              >
                {/* Decorative background glow */}
                <div className={cn(
                  "absolute -top-20 -right-20 w-40 h-40 blur-[80px] -z-10 opacity-20 transition-opacity duration-500 group-hover:opacity-40",
                  plan.name === 'STANDARD' ? 'bg-blue-500' :
                    plan.name === 'PREMIUM' ? 'bg-primary' : 'bg-purple-500'
                )} />

                {plan.popular && (
                  <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/20 backdrop-blur-md">
                    <Star className="text-primary fill-primary" size={10} />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Recommended</span>
                  </div>
                )}

                <div className="mb-10 text-center">
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1.5 mb-2">
                    <span className="text-4xl lg:text-5xl font-black tracking-tighter">
                      {typeof plan.price === 'number' ? `₹${plan.price.toLocaleString()}` : plan.price}
                    </span>
                    {typeof plan.price === 'number' && (
                      <span className="text-muted/60 text-sm font-bold uppercase tracking-widest">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted/40 uppercase tracking-widest font-black">Excl. 18% GST</p>
                  <p className="mt-4 text-sm text-muted font-medium italic">{plan.description}</p>
                </div>

                <div className="space-y-4 mb-10">
                  {plan.features.slice(0, 6).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Check size={10} className="text-primary" />
                      </div>
                      <span className="text-xs font-bold text-muted/80 group-hover:text-white transition-colors capitalize">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className={cn(
                    "w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] group/btn transition-all duration-300",
                    !plan.popular && "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                  onClick={() => {
                    if ((plan.price as any) === 'Custom') {
                      window.open('mailto:sales@WellZo.com');
                    } else if (tenantId) {
                      // Existing tenant flow - go to login with return params
                      navigate(`/login?tenantId=${tenantId}&plan_id=${plan.id}&cycle=${billingCycle.toUpperCase()}&redirect=/billing`);
                    } else {
                      // New user flow
                      navigate(`/register?plan_id=${plan.id}&cycle=${billingCycle.toUpperCase()}`);
                    }
                  }}
                >
                  {plan.price === 'Custom' ? 'Contact Partner' : 'Start Trial Now'}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <section className="rounded-[3rem] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-white/10 p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            <AnimatedText variant="slide-up" className="text-4xl md:text-6xl font-extrabold mb-8 leading-tight">
              Ready to <span className="text-gradient">Transform</span> Your Workplace?
            </AnimatedText>
            <p className="text-xl text-gray-600 dark:text-muted mb-12 leading-relaxed">
              Join hundreds of high-growth companies using WellZo to build a better employee experience.
              Start your 14-day free trial today.
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

        {/* Testimonials (Success Stories) - Moved to End */}
        <section className="mt-24 mb-24">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
              Success Stories
            </motion.span>
            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6">
              Loved by <span className="text-gradient">Visionary Teams</span>.
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
    </div>
  );
};
