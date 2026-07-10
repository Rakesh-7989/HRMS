import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AnimatedText, StaggerText } from '@/components/ui/AnimatedText';
import { ArrowRight, CheckCircle, TrendingUp, Users, Clock, Shield } from 'lucide-react';
import { cn } from '@/utils/cn';

const features = [
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Centralize employee data, manage departments, and track organizational hierarchy.',
  },
  {
    icon: Clock,
    title: 'Attendance Tracking',
    description: 'Automated clock in/out with real-time monitoring and comprehensive reports.',
  },
  {
    icon: TrendingUp,
    title: 'Leave Management',
    description: 'Streamlined leave requests, approvals, and balance tracking for all employees.',
  },
  {
    icon: Shield,
    title: 'Multi-Tenant SaaS',
    description: 'Complete tenant isolation with role-based access control and security.',
  },
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
    quote:
      'WellZo HRMS helped us centralize attendance, leave, and payroll. Our HR team finally has time for people, not paperwork.',
  },
  {
    name: 'Rahul Verma',
    role: 'HR Manager, SaaS Startup',
    quote:
      'The dashboard gives me real-time visibility into headcount, leaves, and payroll. No more juggling spreadsheets.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white relative overflow-y-auto overflow-x-hidden transition-colors duration-300">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-radial opacity-30 dark:opacity-90 pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-light-border dark:border-dark-border bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              whileHover={{ scale: 1.05 }}
            >
              <AnimatedLogo size="md" />
            </motion.div>

            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" onClick={scrollToFeatures}>
                Features
              </Button>
              <Button variant="ghost" onClick={scrollToPricing}>
                Pricing
              </Button>
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate('/register')}>
                Register
              </Button>
              <Button variant="primary" onClick={() => navigate('/login')}>
                Login
              </Button>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                Register
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: 'easeOut' }}
            className="space-y-6"
            style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
              style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
            >
              <motion.span
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.1, duration: 0.5 }}
                className="inline-block px-3 py-1 rounded-full bg-primary-10 dark:bg-primary-20 border border-primary/30 dark:border-primary/40 text-xs text-primary dark:text-primary-400 uppercase tracking-widest hover:bg-primary-20 dark:hover:bg-primary-30 hover:border-primary/50 transition-all"
              >
                HR MANAGEMENT · ATTENDANCE · PAYROLL
              </motion.span>
            </motion.div>

            <AnimatedText variant="slide-up" delay={0.3} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              All-in-one{' '}
              <span className="text-gradient">HR management</span> for modern teams.
            </AnimatedText>

            <AnimatedText variant="fade-in" delay={0.5} className="text-lg text-gray-600 dark:text-muted max-w-lg">
              Centralise employees, automate attendance, approve leave in one click, and run
              payroll in hours instead of days — with an interface your team will actually enjoy
              using.
            </AnimatedText>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => navigate('/register')}>
                Start free trial <ArrowRight className="ml-2 inline" size={20} />
              </Button>
              <Button variant="outline" size="lg" onClick={scrollToFeatures}>
                View features
              </Button>
            </div>

            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: 0.5 }}
              className="flex flex-wrap gap-6 pt-4"
            >
              <motion.div
                whileHover={{ scale: 1.05, x: 4 }}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted"
              >
                <CheckCircle className="text-primary" size={16} />
                <span>No credit card required</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, x: 4 }}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-muted"
              >
                <CheckCircle className="text-accent-green" size={16} />
                <span>Go live in under a week</span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.9, delay: prefersReducedMotion ? 0 : 0.1, ease: 'easeOut' }}
            className="relative"
            style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
          >
            <motion.div
              className={prefersReducedMotion ? '' : 'animate-float'}
              style={{
                transform: 'translateZ(0)', // GPU acceleration
                willChange: prefersReducedMotion ? 'auto' : 'transform'
              }}
            >
              <Card className="border-primary-border shadow-premium p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-radial opacity-80 pointer-events-none" />
                <motion.div
                  className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Today&apos;s overview</span>
                    <span className="px-3 py-1 rounded-full bg-black border border-primary text-xs text-muted">
                      Live HR Snapshot
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Active employees', value: '148' },
                      { label: 'Present today', value: '132' },
                      { label: 'Pending leaves', value: '9' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3"
                      >
                        <p className="text-xs text-gray-600 dark:text-muted">{item.label}</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <div className="flex-1 rounded-lg bg-primary-light border border-gray-300 dark:border-white/20 p-3">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-muted">Attendance</span>
                        <span className="text-xs text-primary">Live</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-green-400" />
                        <div className="flex-[0.5] h-1.5 rounded-full bg-yellow-400" />
                        <div className="flex-[0.7] h-1.5 rounded-full bg-red-400" />
                      </div>
                    </div>
                    <div className="flex-[0.9] rounded-lg bg-gray-100/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
                      <p className="text-xs text-gray-600 dark:text-muted">Next payroll</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">5 days left · Draft ready</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Section */}
        <section id="features" className="mb-20">
          <div className="text-center mb-12">
            <AnimatedText variant="slide-up" delay={0.2}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <StaggerText
                  words={['Everything', 'you', 'need']}
                  className="text-3xl md:text-4xl font-bold"
                  delay={0.1}
                />
              </h2>
            </AnimatedText>
            <AnimatedText variant="fade-in" delay={0.4} className="text-gray-600 dark:text-muted text-lg max-w-2xl mx-auto">
              Comprehensive HR management tools designed for modern organizations
            </AnimatedText>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: prefersReducedMotion ? 0 : index * 0.1, duration: 0.5, ease: 'easeOut' }}
                  style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card hover className="h-full group">
                      <div>
                        <Icon className="text-primary mb-4 group-hover:text-accent-blue transition-colors" size={32} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                      <p className="text-gray-600 dark:text-muted text-sm">{feature.description}</p>
                    </Card>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Workflow & Stats */}
        <section className="grid lg:grid-cols-2 gap-16 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <span className="text-xs uppercase text-gray-600 dark:text-muted tracking-widest">How it works</span>
            <AnimatedText variant="slide-right" delay={0.2}>
              <h2 className="text-3xl font-bold mb-5">
                Go live in three <span className="text-gradient">simple steps</span>.
              </h2>
            </AnimatedText>

            {workflow.map((item, index) => (
              <motion.div
                key={item.step}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex gap-4"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-full border-2 border-primary px-3 py-1 text-xs font-medium bg-primary-10 dark:bg-primary-20 text-primary shrink-0"
                >
                  {item.step}
                </motion.div>
                <div>
                  <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-muted">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
          >
            <Card>
              <span className="text-xs uppercase text-gray-600 dark:text-muted tracking-widest">Outcomes</span>
              <h3 className="text-xl font-semibold mb-4 mt-2">
                Designed for HR teams that do more with less.
              </h3>

              <div className="grid grid-cols-3 gap-4 mb-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-lg font-semibold text-gradient">{stat.value}</p>
                    <p className="text-xs text-gray-600 dark:text-muted">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-white/20 my-4" />

              <p className="text-xs text-gray-600 dark:text-muted">
                Built for HR, finance, founders, and people managers to collaborate on one source
                of truth for your workforce.
              </p>
            </Card>
          </motion.div>
        </section>

        {/* Testimonials */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <span className="text-xs uppercase text-gray-600 dark:text-muted tracking-widest">
              Teams that trust WellZo
            </span>
            <AnimatedText variant="slide-up" delay={0.2}>
              <h2 className="text-3xl font-bold mt-2">
                HR that people actually <span className="text-gradient">love to use</span>.
              </h2>
            </AnimatedText>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  delay: prefersReducedMotion ? 0 : index * 0.1,
                  duration: 0.5,
                  ease: 'easeOut',
                }}
                style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
              >
                <Card hover className="h-full">
                  <p className="text-sm text-gray-600 dark:text-muted mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-full bg-gradient-premium flex items-center justify-center font-bold text-white shadow-glow"
                    >
                      {testimonial.name.charAt(0)}
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium">{testimonial.name}</p>
                      <p className="text-xs text-gray-600 dark:text-muted">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <div id="pricing" className="mb-20">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            className="text-center mb-12"
            style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
          >
            <AnimatedText variant="slide-up" delay={0.2}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple, transparent <span className="text-gradient">pricing</span>
              </h2>
            </AnimatedText>
            <AnimatedText variant="fade-in" delay={0.4} className="text-gray-600 dark:text-muted text-lg max-w-2xl mx-auto">
              Choose the plan that works best for your organization
            </AnimatedText>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: 29,
                period: 'month',
                description: 'Perfect for small teams',
                features: ['Up to 25 employees', 'Basic attendance', 'Leave management', 'Email support'],
                popular: false,
              },
              {
                name: 'Professional',
                price: 79,
                period: 'month',
                description: 'For growing organizations',
                features: [
                  'Up to 100 employees',
                  'Advanced analytics',
                  'Payroll integration',
                  'Priority support',
                  'API access',
                ],
                popular: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For large organizations',
                features: ['Unlimited employees', 'White-label', 'Dedicated support', 'Custom integrations'],
                popular: false,
              },
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  delay: prefersReducedMotion ? 0 : index * 0.1,
                  duration: 0.5,
                  ease: 'easeOut',
                }}
                className={cn('relative', plan.popular && 'md:-mt-4 md:mb-4')}
                style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
              >
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
                  >
                    <span className="px-4 py-1 rounded-full bg-gradient-premium text-white text-sm font-semibold shadow-glow">
                      Most Popular
                    </span>
                  </motion.div>
                )}
                <Card
                  hover={false}
                  className={cn(
                    'h-full flex flex-col',
                    plan.popular &&
                    'border-primary-border border-2 shadow-primary bg-gradient-to-b from-gold-light/30 to-transparent'
                  )}
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted text-sm mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      {typeof plan.price === 'number' ? (
                        <>
                          <span className="text-4xl font-bold">${plan.price}</span>
                          <span className="text-muted">/{plan.period}</span>
                        </>
                      ) : (
                        <span className="text-4xl font-bold">{plan.price}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full mb-6"
                    onClick={() =>
                      plan.price === 'Custom'
                        ? window.open('mailto:sales@hrmspro.com')
                        : navigate('/register')
                    }
                  >
                    {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}{' '}
                    <ArrowRight className="ml-2 inline" size={18} />
                  </Button>

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle
                          size={20}
                          className={cn('mt-0.5 shrink-0', plan.popular ? 'text-primary' : 'text-green-400')}
                        />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <motion.section
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent-blue/10 to-accent-green/10 border border-primary-border p-8 md:p-12 backdrop-blur-sm"
          style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <AnimatedText variant="slide-up" delay={0.2}>
                <h2 className="text-2xl font-bold mb-2">
                  Ready to modernize your <span className="text-gradient">HR operations</span>?
                </h2>
              </AnimatedText>
              <AnimatedText variant="fade-in" delay={0.4} className="text-gray-600 dark:text-muted">
                Create your account in minutes, invite your team, and see how WellZo simplifies
                attendance, leave, and payroll from day one.
              </AnimatedText>
            </div>
            <div className="flex gap-3">
              <Button size="md" onClick={() => navigate('/register')}>
                Register now <ArrowRight className="ml-2 inline" size={18} />
              </Button>
              <Button variant="ghost" size="md" onClick={scrollToPricing}>
                View pricing
              </Button>
            </div>
          </div>
        </motion.section>
      </section>
    </div>
  );
};

