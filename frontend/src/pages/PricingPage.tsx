import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Check, ArrowRight, Star, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

const plans = [
  {
    name: 'Starter',
    price: 29,
    period: 'month',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 25 employees',
      'Basic attendance tracking',
      'Leave management',
      'Email support',
      'Standard reports',
      'Mobile app access',
    ],
    popular: false,
    cta: 'Start free trial',
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
      'Custom reports',
      'API access',
      'Multi-location support',
      'Role-based dashboards',
    ],
    popular: true,
    cta: 'Start free trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Unlimited employees',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'Advanced security',
      'SLA guarantee',
      'On-premise option',
      'Custom training',
    ],
    popular: false,
    cta: 'Contact sales',
  },
];

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white transition-colors duration-300">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-light-border dark:border-dark-border bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.05 }}
            >
              <AnimatedLogo size="md" />
              <span className="text-xl font-bold text-primary tracking-widest">WellZo</span>
            </motion.div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="mr-2" size={16} />
                Back to Home
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-20 px-6">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
          style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent <span className="text-primary">pricing</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-muted max-w-2xl mx-auto">
            Choose the plan that works best for your organization. All plans include a 14-day free
            trial.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : index * 0.1,
                duration: 0.5,
                ease: 'easeOut',
              }}
              className={cn('relative', plan.popular && 'md:-mt-4 md:mb-4')}
              style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1 rounded-full bg-primary text-black text-sm font-semibold flex items-center gap-1">
                    <Star size={14} className="fill-current" />
                    Most Popular
                  </span>
                </div>
              )}
              <Card
                hover={false}
                className={cn(
                  'h-full flex flex-col',
                  plan.popular &&
                    'border-primary-border border-2 shadow-primary bg-gradient-to-b from-gold-light/20 to-transparent'
                )}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-gray-600 dark:text-muted text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    {typeof plan.price === 'number' ? (
                      <>
                        <span className="text-4xl font-bold">₹{plan.price}</span>
                          <span className="text-gray-600 dark:text-muted">/{plan.period}</span>
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
                  {plan.cta} <ArrowRight className="ml-2 inline" size={18} />
                </Button>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        size={20}
                        className={cn(
                          'mt-0.5 shrink-0',
                          plan.popular ? 'text-primary' : 'text-green-400'
                        )}
                      />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: 0.6, ease: 'easeOut' }}
          className="max-w-3xl mx-auto"
          style={{ willChange: prefersReducedMotion ? 'auto' : 'opacity, transform' }}
        >
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, bank transfers, and can arrange invoicing for enterprise customers.',
              },
              {
                q: 'Is there a setup fee?',
                a: 'No setup fees for any plan. All plans include full onboarding support.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes, we offer a 30-day money-back guarantee if you&apos;re not satisfied with the service.',
              },
            ].map((faq, idx) => (
              <Card key={idx} hover={false} className="bg-white/5 dark:bg-white/5">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 dark:text-muted">{faq.a}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

