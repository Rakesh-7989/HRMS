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
  Smartphone, Tablet, Globe, LayoutDashboard, Briefcase, UserCheck,
  MapPin, Columns, ClipboardList, Calendar, IndianRupee, Loader2, Star, Check,
  MessageCircle, Video, Zap,
  Package, Network, Users,
  Twitter, Linkedin, Github, Youtube, Mail, Phone
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { plansService } from '@/services/plans.service';
import { cn } from '@/utils/cn';
import rolesVisual from '@/assets/hrms_roles.png';
import { useTranslation } from 'react-i18next';
import { ContactSalesModal } from '@/components/ContactSalesModal';

const FloatingBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl"
          animate={{
            x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: 300 + i * 100 + "px",
            height: 300 + i * 100 + "px",
            left: "-10%",
            top: "-10%",
          }}
        />
      ))}
    </div>
  );
};

const FeatureVisual: React.FC<{ feature: any; colorConfig: any }> = ({ feature, colorConfig }) => {
  const Icon = feature.icon;

  return (
    <div className={cn(
      "relative z-10 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 h-full bg-gradient-to-br flex flex-col items-center justify-center p-4 transition-all duration-500 group-hover:bg-black/[0.05] dark:group-hover:bg-white/[0.05]",
      colorConfig.gradient
    )}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      {feature.id === 'geofencing' && (
        <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
          <motion.div
            className="relative"
            animate={{
              rotateX: [0, 10, 0],
              rotateY: [0, 20, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
            <MapPin size={48} className={cn("relative z-10", colorConfig.text)} style={{ filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.4))' }} />
            <motion.div
              animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border-2", colorConfig.text.replace('text', 'border'))}
            />
          </motion.div>
        </div>
      )}

      {feature.id === 'timesheets' && (
        <div className="w-full space-y-4 px-2" style={{ perspective: '1000px' }}>
          <motion.div
            className="space-y-3"
            whileHover={{ rotateX: 15, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {[85, 55, 95].map((w, i) => (
              <div key={i} className="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${w}%` }}
                  transition={{ duration: 1.2, delay: 0.5 + i * 0.15, ease: "circOut" }}
                  className={cn("h-full relative", colorConfig.glow)}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse" style={{ width: '30%' }} />
                </motion.div>
              </div>
            ))}
          </motion.div>
          <div className="flex justify-between items-center mt-2 p-2 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
            <Clock size={16} className={cn("animate-spin-slow", colorConfig.text)} />
            <div className="text-[10px] font-mono tracking-widest font-bold opacity-80">ACTIVE LOG</div>
          </div>
        </div>
      )}

      {feature.id === 'attendance' && (
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-full animate-pulse" />
          <svg className="w-full h-full transform -rotate-90 scale-110" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4" className="text-black/5 dark:text-white/10" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
              strokeDasharray="264"
              initial={{ strokeDashoffset: 264 }}
              whileInView={{ strokeDashoffset: 80 }}
              transition={{ duration: 2, ease: "backOut" }}
              className={cn(colorConfig.text, "drop-shadow-[0_0_8px_currentColor]")}
              style={{ strokeLinecap: 'round' }}
            />
          </svg>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ClipboardList size={28} className={cn("opacity-90 drop-shadow-md", colorConfig.text)} />
          </motion.div>
        </div>
      )}

      {feature.id === 'leave' && (
        <div className="grid grid-cols-4 gap-2 w-full max-w-[130px] p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg preserve-3d">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ rotateX: 0 }}
              whileHover={{ rotateX: 45, translateZ: 10 }}
              className={cn(
                "h-7 rounded-md border transition-colors duration-300",
                i === 5 || i === 9
                  ? cn(colorConfig.glow, "border-white/20 shadow-lg shadow-current/20")
                  : "bg-black/5 dark:bg-white/5 border-transparent"
              )}
            />
          ))}
        </div>
      )}

      {feature.id === 'security' && (
        <div className="relative group/security" style={{ perspective: '1000px' }}>
          <motion.div
            animate={{
              rotateZ: 360,
              rotateX: [0, 15, 0],
              rotateY: [0, 15, 0]
            }}
            transition={{
              rotateZ: { duration: 25, repeat: Infinity, ease: "linear" },
              rotateX: { duration: 5, repeat: Infinity },
              rotateY: { duration: 7, repeat: Infinity }
            }}
            className="w-28 h-28 border-2 border-dashed border-primary/20 rounded-full flex items-center justify-center relative"
          >
            <div className="absolute inset-2 border border-primary/10 rounded-full animate-ping" />
            <motion.div
              className="w-22 h-22 border border-white/10 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Shield size={40} className={cn("filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]", colorConfig.text)} />
            </motion.div>
          </motion.div>
        </div>
      )}

      {feature.id === 'payroll' && (
        <div className="relative flex flex-col items-center justify-center py-6">
          <motion.div
            animate={{
              y: [0, -12, 0],
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-fuchsia-500/20 blur-2xl rounded-full scale-150" />
            <IndianRupee size={64} className={cn("relative z-10 drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)]", colorConfig.text)} />
          </motion.div>
          <div className="flex gap-2 mt-8">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{
                  scaleY: [0.3, 1, 0.3],
                  opacity: [0.2, 1, 0.2]
                }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                className={cn("w-2.5 h-10 rounded-full", colorConfig.glow, "shadow-lg shadow-current/30")}
              />
            ))}
          </div>
        </div>
      )}

      {feature.id === 'kanban' && (
        <div className="flex gap-3 h-28 items-center justify-center" style={{ perspective: '1000px' }}>
          {[0, 1, 2].map((col) => (
            <motion.div
              key={col}
              animate={{ y: [0, col % 2 === 0 ? -10 : 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-32 bg-white/5 border border-white/10 rounded-xl p-2 space-y-3 backdrop-blur-sm shadow-xl"
            >
              <div className={cn("h-1 w-8 rounded-full opacity-40", colorConfig.glow)} />
              {[0, 1].map((card) => (
                <motion.div
                  key={card}
                  whileHover={{ scale: 1.1, translateZ: 20 }}
                  className="h-8 w-full bg-white/10 rounded-lg border border-white/5 shadow-inner"
                />
              ))}
            </motion.div>
          ))}
        </div>
      )}

      {feature.id === 'collaboration' && (
        <div className="relative flex items-center justify-center gap-6" style={{ perspective: '1000px' }}>
          <motion.div
            animate={{
              y: [0, -15, 0],
              rotateY: [0, 45, 0],
              z: [0, 50, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="p-4 rounded-[2rem] bg-gradient-to-br from-white/20 to-transparent backdrop-blur-xl border border-white/30 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
          >
            <MessageCircle size={36} className={cn("filter drop-shadow-lg", colorConfig.text)} />
          </motion.div>
          <motion.div
            animate={{
              y: [0, 15, 0],
              rotateY: [0, -45, 0],
              z: [0, 50, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
            className="p-4 rounded-[2rem] bg-gradient-to-br from-white/20 to-transparent backdrop-blur-xl border border-white/30 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
          >
            <Video size={36} className={cn("filter drop-shadow-lg", colorConfig.text)} />
          </motion.div>
          <div className="absolute inset-0 bg-primary/20 blur-[60px] -z-10 animate-pulse" />
        </div>
      )}

      {feature.id === 'assets' && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-[140px] p-2" style={{ transformStyle: 'preserve-3d' }}>
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{
                scale: [0.9, 1.1, 0.9],
                rotateX: [0, 20, 0],
                rotateY: [0, 20, 0]
              }}
              transition={{ duration: 3, delay: i * 0.3, repeat: Infinity }}
              className="aspect-square bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-sm"
            >
              <Package size={24} className={cn("filter drop-shadow-md", colorConfig.text)} />
            </motion.div>
          ))}
        </div>
      )}

      {feature.id === 'hierarchy' && (
        <div className="relative w-32 h-32 flex items-center justify-center" style={{ perspective: '800px' }}>
          <motion.div
            animate={{ rotateZ: 360, rotateX: 20 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border border-dashed border-primary/30 rounded-full"
          />
          <div className="flex flex-col gap-4 items-center relative z-10 preserve-3d">
            <motion.div
              whileHover={{ translateZ: 30 }}
              className="p-3 bg-white/15 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md"
            >
              <Network size={28} className={colorConfig.text} />
            </motion.div>
            <div className="flex gap-6">
              {[0, 1].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.15, 1], translateZ: [0, 20, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 1.5 }}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/20 shadow-lg"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {feature.id === 'reports' && (
        <div className="flex items-end gap-2 h-24 p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner">
          {[45, 85, 55, 100, 75, 90].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, scale: 0.8 }}
              whileInView={{ height: `${h}%`, scale: 1 }}
              transition={{ duration: 1.5, delay: i * 0.1, ease: "backOut" }}
              className={cn("w-4 rounded-t-md relative group/bar", colorConfig.glow)}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-t-md" />
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      )}

      {feature.id === '2fa' && (
        <div className="relative" style={{ perspective: '1000px' }}>
          <motion.div
            animate={{
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="p-7 bg-gradient-to-tr from-white/20 to-transparent rounded-[2.5rem] border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          >
            <Shield size={48} className={cn("filter drop-shadow-2xl", colorConfig.text)} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 2], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn("absolute inset-0 rounded-[2.5rem] border-2", colorConfig.text.replace('text', 'border'))}
          />
        </div>
      )}

      {feature.id === 'shifts' && (
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.35, 0.15]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn("absolute inset-0 blur-3xl", colorConfig.glow)}
          />
          <motion.div
            whileHover={{ rotateY: 20, rotateX: -10, scale: 1.1 }}
            className="relative z-20 transition-transform duration-500 preserve-3d"
          >
            <Icon size={52} className={cn("drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] filter contrast-125", colorConfig.text)} />
          </motion.div>
        </div>
      )}

      {!['geofencing', 'timesheets', 'kanban', 'payroll', 'attendance', 'leave', 'security', 'collaboration', 'assets', 'hierarchy', 'reports', '2fa', 'shifts'].includes(feature.id) && (
        <motion.div
          whileHover={{ rotateY: 15, rotateX: -15, z: 50 }}
          className="relative z-20 transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Icon size={64} className={cn("opacity-40 group-hover:opacity-100 transition-all duration-500 drop-shadow-[0_20px_20px_rgba(0,0,0,0.2)]", colorConfig.text)} />
          <div className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 -z-10 bg-current rounded-full" />
        </motion.div>
      )}
    </div>
  );
};

const keyFeatures = [
  {
    id: 'geofencing',
    title: 'Geo-Fencing Attendance',
    icon: MapPin,
    color: 'purple',
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
    icon: IndianRupee,
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
  },
  {
    id: 'collaboration',
    title: 'Collaboration Hub',
    icon: MessageCircle,
    color: 'blue',
    points: [
      'Real-time team chat & channels',
      'Integrated video conferencing',
      'File sharing & document co-authoring',
      'Instant company-wide announcements'
    ],
    description: "Break down communication silos. Connect your entire workforce with a unified hub for messaging, calls, and real-time project collaboration."
  },
  {
    id: 'assets',
    title: 'Asset Tracking',
    icon: Package,
    color: 'amber',
    points: [
      'Complete IT & physical asset inventory',
      'Asset assignment & recovery workflows',
      'Depreciation tracking & reporting',
      'Maintenance schedule alerts'
    ],
    description: "Manage your company's physical and digital assets with ease. Track assignments, monitor lifecycles, and ensure nothing goes missing."
  },
  {
    id: 'hierarchy',
    title: 'Org Visualizer',
    icon: Network,
    color: 'indigo',
    points: [
      'Dynamic, interactive org charts',
      'Department & team mapping',
      'Reporting line visualization',
      'Quick-find employee directory'
    ],
    description: "Visualize your organization like never before. Navigate through departments and reporting lines with an interactive, real-time organizational chart."
  },
  {
    id: 'shifts',
    title: 'Shift Planning',
    icon: Users,
    color: 'purple',
    points: [
      'Dynamic roster management',
      'Shift swap & coverage requests',
      'Auto-scheduling based on availability',
      'Overtime & compliance monitoring'
    ],
    description: "Master complex scheduling. Create, manage, and communicate shifts instantly, ensuring optimal coverage and compliance with ease."
  },
  {
    id: 'recruitment',
    title: 'Recruitment & ATS',
    icon: Briefcase,
    color: 'rose',
    points: [
      'End-to-end applicant tracking',
      'Custom hiring pipelines',
      'Interview scheduling & feedback',
      'Automated offer letter generation'
    ],
    description: "Hire top talent faster. Streamline your entire recruitment process from job posting to onboarding with an integrated applicant tracking system."
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
    description: 'Add employees in seconds. Set locations, departments, and managers.',
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
    avatarColor: 'bg-violet-500',
    quote: 'WellZo HRMS helped us centralize attendance, leave, and payroll. Our HR team finally has time for people, not paperwork.',
  },
  {
    name: 'Rahul Verma',
    role: 'HR Manager, SaaS Startup',
    avatarColor: 'bg-purple-500',
    quote: 'The dashboard gives me real-time visibility into headcount, leaves, and payroll. No more juggling spreadsheets.',
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
    color: 'from-purple-500/20 to-purple-500/10'
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
    color: 'from-purple-500/20 to-teal-500/10'
  }
];



const planMeta: Record<string, {
  subtitle: string;
  tagline: string;
  highlights: string[];
  included: string;
}> = {
  STANDARD: {
    subtitle: 'Starter',
    tagline: 'Essential HR tools for small teams looking to digitize their operations',
    highlights: [
      'Digital Employee Directory & Org Chart',
      'Basic Leave & Attendance Mgmt',
      'Team Collaboration & Announcements',
      'Personal Employee Dashboards',
      'Holiday Calendar Integration',
      'Mobile Attendance (GPS restricted)',
      'Basic Email Notifications',
      'Self-Service Portal Access',
    ],
    included: 'Core HR foundation for up to 50 members',
  },
  PREMIUM: {
    subtitle: 'Growth',
    tagline: 'Advanced automation and insights for scaling mid-market organizations',
    highlights: [
      'Everything in Standard, plus:',
      'Advanced Attendance (Geo-fencing & IP)',
      'Kanban Boards & Resource Planning',
      'Asset Lifecycle & Inventory Mgmt',
      'KPI/OKR Tracking & 360° Feedback',
      'Custom Approval Chains & Triggers',
      'Full Payroll Compliance & Expenses',
      'Priority 9/5 Email Support',
    ],
    included: 'Growth powerhouse for teams up to 250 members',
  },
  ELITE: {
    subtitle: 'Enterprise',
    tagline: 'Complete ecosystem with AI insights, deep security, and dedicated support',
    highlights: [
      'Everything in Premium, plus:',
      'AI Productivity Scoring & Activity Monitoring',
      'Recruitment & ATS Applicant Tracking',
      'White-Label Branding & SSO/SAML',
      'Dedicated Customer Success Manager',
      'Advanced API & Multi-System Integration',
      'Shift Roster & Biometric Integration',
      '24/7 Priority Phone & Chat Support',
    ],
    included: 'Enterprise resilience for unlimited scaling',
  },
};

export const LandingPage: React.FC = () => {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [billingCycle, setBillingCycle] = React.useState<string>('MONTHLY');
  const [highlightedFeature, setHighlightedFeature] = React.useState<string | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);


  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    <div ref={containerRef} className="h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white relative overflow-y-auto overflow-x-hidden transition-colors duration-300 scroll-smooth selection:bg-primary selection:text-white">
      <ContactSalesModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      <FloatingBackground />

      {/* Spotlight Effect */}
      <motion.div
        className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-300 opacity-0 md:opacity-100"
        animate={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--primary), 0.05), transparent 80%)`
        }}
      />
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

      <section className="relative z-10 max-w-7xl mx-auto px-5 pt-36 mb-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center space-y-10 mb-20"
        >
          <motion.div variants={fadeInUp} className="max-w-4xl">
            <motion.div
              className="relative inline-block mb-8"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                variants={fadeInUp}
                className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-[0.2em] relative z-10 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-primary/40"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                Enterprise-Ready HR Management
              </motion.span>
            </motion.div>

            <AnimatedText
              variant="slide-up"
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-8 text-gray-900 dark:text-white pb-2"
            >
              Professional <span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">HR & Payroll</span> for Growing Organizations.
            </AnimatedText>

            <AnimatedText
              variant="fade-in"
              delay={0.4}
              className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
            >
              Streamline your employee management, attendance tracking, and payroll processing in a single, secure multi-tenant platform. Built for reliability and ease of use.
            </AnimatedText>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-5 justify-center relative z-20">
              <Button size="lg" className="rounded-xl px-8 py-5 text-base group relative overflow-hidden bg-primary shadow-[0_10px_20px_rgba(var(--primary),0.3)]" onClick={() => navigate('/pricing')}>
                <motion.div
                  className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skewed-x-12"
                  style={{ skewX: -20 }}
                />
                <span className="relative z-10 flex items-center">
                  Start 14-Day Free Trial <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </span>
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl px-8 py-5 text-base border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 backdrop-blur-sm shadow-sm" onClick={() => window.location.href = '#about'}>
                About the Product
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating 3D Elements Placeholder for Hero */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse" />
        <div className="absolute top-1/4 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] -z-10" style={{ animationDelay: '2s' }} />
      </section>


      <main className="max-w-7xl mx-auto px-6">
        {/* Platforms Section */}
        <section id="about" className="py-24 border-y border-gray-100 dark:border-white/5 mb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-md text-center md:text-left">
                <AnimatedText variant="slide-up" className="text-3xl font-bold mb-4">
                  About <span className="text-gradient">The Product</span>.
                </AnimatedText>
                <p className="text-gray-600 dark:text-muted">
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

        {/* HRMS Ecosystem & Roles Section */}
        <section className="mb-24">
          <div className="text-center mb-20">
            <motion.span variants={fadeInUp} className="text-primary text-xs font-bold tracking-[0.3em] uppercase mb-4 block">Tailored Experience</motion.span>
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
                ? (feature.id === 'geofencing' || feature.id === 'payroll' || feature.id === 'collaboration')
                : (feature as any).isLarge;

              const colorConfig = {
                purple: { text: 'text-purple-500', dot: 'bg-purple-500/40', glow: 'bg-purple-500', gradient: 'from-purple-500/20 via-purple-500/5 to-transparent' },
                blue: { text: 'text-violet-500', dot: 'bg-violet-500/40', glow: 'bg-violet-500', gradient: 'from-blue-500/20 via-blue-500/5 to-transparent' },
                amber: { text: 'text-fuchsia-500', dot: 'bg-fuchsia-500/40', glow: 'bg-fuchsia-500', gradient: 'from-amber-500/20 via-amber-500/5 to-transparent' },
                rose: { text: 'text-rose-500', dot: 'bg-rose-500/40', glow: 'bg-rose-500', gradient: 'from-rose-500/20 via-rose-500/5 to-transparent' },
                indigo: { text: 'text-purple-500', dot: 'bg-purple-500/40', glow: 'bg-purple-500', gradient: 'from-purple-500/20 via-purple-500/5 to-transparent' },
                slate: { text: 'text-slate-500', dot: 'bg-slate-500/40', glow: 'bg-slate-500', gradient: 'from-slate-500/20 via-slate-500/5 to-transparent' },
              }[feature.color as string] || { text: 'text-primary', dot: 'bg-primary/40', glow: 'bg-primary', gradient: 'from-primary/20 via-primary/5 to-transparent' };

              return (
                <motion.div
                  key={feature.id}
                  id={`feature-${feature.id}`}
                  variants={fadeInUp}
                  whileHover={{
                    y: -10,
                    rotateY: isLarge ? 5 : 8,
                    rotateX: -2,
                    scale: 1.02
                  }}
                  className={cn(
                    "relative group rounded-[2rem] overflow-hidden border border-black/5 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-2xl transition-all duration-500 hover:border-primary/30 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_30px_60px_-15px_rgba(var(--primary),0.1)]",
                    isLarge ? "md:col-span-2" : "col-span-1",
                    highlightedFeature === feature.id && "ring-2 ring-primary ring-offset-4 ring-offset-light-bg dark:ring-offset-dark-bg scale-[1.02] shadow-[0_0_50px_rgba(var(--primary),0.2)]",
                    "preserve-3d"
                  )}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="p-8 h-full flex flex-col relative z-20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn(
                        "p-3 rounded-2xl bg-white dark:bg-black/40 shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500",
                        colorConfig.text
                      )}>
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{feature.title}</h3>
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
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-500 border border-purple-500/20">
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
                      onClick={() => {
                        if (plan.name === 'ELITE') {
                          setIsContactModalOpen(true);
                        } else {
                          navigate('/pricing');
                        }
                      }}
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
                  { label: 'Core HRMS', featureId: 'attendance' },
                  { label: 'Payroll Automation', featureId: 'payroll' },
                  { label: 'Asset Tracking', featureId: 'assets' },
                  { label: 'Org Visualizer', featureId: 'hierarchy' },
                  { label: 'Collaboration Hub', featureId: 'collaboration' },
                  { label: 'Shift Planning', featureId: 'shifts' }
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
                  <a href="mailto:info@WellZo.com" className="flex items-center gap-4 group">
                    <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-0.5 opacity-60">Email Us</p>
                      <p className="text-base text-gray-900 dark:text-white/90 font-semibold group-hover:text-primary transition-colors">info@WellZo.com</p>
                    </div>
                  </a>
                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    Send Message
                  </button>
                </li>
                <li>
                  <div className="flex items-center gap-4 group">
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 shadow-sm">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase mb-0.5 opacity-60">Call Sales</p>
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
