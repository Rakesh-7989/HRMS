import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, IndianRupee, TrendingUp, Users, Building2, Star, Quote } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { cn } from '@/utils/cn';

const caseStudies = [
  {
    id: 'bharatpay',
    company: 'BharatPay Fintech',
    industry: 'Fintech',
    location: 'Bengaluru, KA',
    employees: '120',
    challenge: 'Managing payroll across 3 states with different PF/ESI rules. Manual Form 16 processing took 3 days each month.',
    solution: 'WellZo automated all PF/ESI/PT filings with state-specific rules. Form 16 generation is now one-click.',
    results: [
      { metric: '₹12L', label: 'Annual savings' },
      { metric: '3 days → 2 hrs', label: 'Payroll cycle' },
      { metric: '100%', label: 'Compliance accuracy' },
    ],
    quote: 'WellZo handles our PF, ESI, and PT filings automatically. What used to take our CA 3 days now happens in 2 hours.',
    author: 'Ananya Sharma',
    role: 'Head of HR',
    color: 'from-brand-500 to-brand-700',
  },
  {
    id: 'greenleaf',
    company: 'GreenLeaf Manufacturing',
    industry: 'Manufacturing',
    location: 'Ahmedabad, GJ',
    employees: '500+',
    challenge: 'Factory workers with no digital attendance. Shift management for 3 shifts across 2 plants was chaotic.',
    solution: 'Biometric integration with WellZo. Shift roster with auto-scheduling and overtime calculation.',
    results: [
      { metric: '500+', label: 'Employees onboarded' },
      { metric: '85%', label: 'Time saved on rostering' },
      { metric: '0', label: 'Payroll disputes' },
    ],
    quote: 'Shift management with 500+ factory workers was a nightmare. WellZo\'s biometric integration made it effortless.',
    author: 'Priya Patel',
    role: 'Director - Operations',
    color: 'from-teal-500 to-teal-700',
  },
  {
    id: 'quickcart',
    company: 'QuickCart Retail',
    industry: 'Retail',
    location: 'Mumbai, MH',
    employees: '30 → 150',
    challenge: 'Startup scaling fast — needed an affordable HRMS that could grow from 30 to 150+ employees.',
    solution: 'WellZo Standard plan scaled seamlessly. Added geo-fencing for delivery staff and AI performance reviews.',
    results: [
      { metric: '5x', label: 'Team growth' },
      { metric: '₹0', label: 'Hidden costs' },
      { metric: '4.9★', label: 'Employee satisfaction' },
    ],
    quote: 'WellZo\'s Standard plan gave us everything — leave, attendance, payslips — at a price that works for a growing team.',
    author: 'Suresh K.',
    role: 'Founder',
    color: 'from-coral-500 to-coral-700',
  },
];

export const CaseStudiesSection: React.FC = () => {
  return (
    <section className="py-24 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-brand-500 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            Case Studies
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-neutral-900 dark:text-white">
            Real Results from{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-teal-500">
              Indian Businesses
            </span>
          </AnimatedText>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
            See how companies across India use WellZo to streamline HR, payroll, and compliance.
          </p>
        </div>

        <div className="space-y-16">
          {caseStudies.map((cs, i) => (
            <motion.div key={cs.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="relative grid md:grid-cols-5 gap-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-8 hover:shadow-elev-4 transition-shadow"
            >
              <div className="md:col-span-2">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cs.color} flex items-center justify-center text-white font-bold text-sm`}>
                        {cs.company.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900 dark:text-white">{cs.company}</h3>
                        <p className="text-xs text-neutral-500">{cs.industry} · {cs.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-400 mt-2">
                      <span className="flex items-center gap-1"><Users size={12} /> {cs.employees} employees</span>
                      <span className="flex items-center gap-1"><Star size={12} className="fill-yellow-400 text-yellow-400" /> Case Study</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-coral-500 uppercase tracking-wider mb-1">Challenge</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{cs.challenge}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-teal-500 uppercase tracking-wider mb-1">Solution</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{cs.solution}</p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <Quote size={16} className="text-brand-300 dark:text-brand-700 mb-2" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 italic leading-relaxed">"{cs.quote}"</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${cs.color} flex items-center justify-center text-white text-[9px] font-bold`}>
                      {cs.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">{cs.author}</p>
                      <p className="text-[10px] text-neutral-400">{cs.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-4">Results</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {cs.results.map((r) => (
                    <div key={r.label} className="text-center p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                      <p className="text-2xl md:text-3xl font-extrabold text-brand-600 dark:text-brand-400">{r.metric}</p>
                      <p className="text-xs text-neutral-500 mt-1">{r.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  <div className="p-4 border-b border-neutral-100 dark:border-neutral-700">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Timeline</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {[
                      { phase: 'Week 1-2', title: 'Onboarding & Setup', desc: 'Employee data migration, attendance device integration, payroll configuration with PF/ESI rules.' },
                      { phase: 'Week 3', title: 'First Payroll Run', desc: 'Parallel run with existing system. All compliance reports generated and verified.' },
                      { phase: 'Week 4+', title: 'Full Go-Live', desc: 'Company-wide rollout. All modules live. Ongoing support and optimisation.' },
                    ].map((phase, pi) => (
                      <div key={pi} className="flex gap-4">
                        <div className="w-20 shrink-0">
                          <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded">{phase.phase}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">{phase.title}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{phase.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-center mt-12">
          <p className="text-neutral-400 text-sm mb-4">Want to be our next success story?</p>
          <button className="inline-flex items-center gap-2 text-brand-500 font-bold text-sm hover:text-brand-600 transition-colors">
            Start Your Free Trial <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
