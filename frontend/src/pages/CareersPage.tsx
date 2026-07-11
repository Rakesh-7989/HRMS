import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, Clock, IndianRupee, Heart, Zap, Users, BookOpen, Coffee, ArrowRight } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

interface Position {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  requirements: string[];
}

const positions: Position[] = [
  { id: 'sr-frontend', title: 'Senior Frontend Engineer', department: 'Engineering', location: 'Bengaluru, India', type: 'Full-time', experience: '3-6 years', description: 'Build and maintain our React-based HRMS platform from the ground up.', requirements: ['3+ years React experience', 'TypeScript proficiency', 'UI/UX sensibility', 'Startup mindset'] },
  { id: 'backend', title: 'Backend Engineer - Node.js', department: 'Engineering', location: 'Bengaluru, India', type: 'Full-time', experience: '2-5 years', description: 'Design and build scalable APIs for payroll, compliance, and real-time features.', requirements: ['2+ years Node.js', 'PostgreSQL expertise', 'API design', 'Cloud services'] },
  { id: 'customer-success', title: 'Customer Success Manager', department: 'Customer Success', location: 'Bengaluru, India', type: 'Full-time', experience: '2-4 years', description: 'Help Indian SMBs onboard and succeed with WellZo.', requirements: ['2+ years customer-facing', 'SaaS experience', 'Hindi + English', 'HR domain knowledge a plus'] },
  { id: 'sales', title: 'Sales Development Representative', department: 'Sales', location: 'Bengaluru, India', type: 'Full-time', experience: '1-3 years', description: 'Drive lead qualification and outbound prospecting for Indian SMB market.', requirements: ['1+ year B2B sales', 'Excellent communication', 'Hindi + English', 'Self-motivated'] },
];

const benefits = [
  { icon: Heart, title: 'Health Insurance', desc: 'Coverage for you and your family' },
  { icon: IndianRupee, title: 'Competitive Salary', desc: 'Above-market pay with ESOPs' },
  { icon: Zap, title: 'Learning Budget', desc: 'Annual L&D allowance' },
  { icon: Coffee, title: 'Flexible Work', desc: 'Remote-first culture' },
  { icon: Clock, title: 'Flexible Hours', desc: 'Own your schedule' },
  { icon: BookOpen, title: 'Free WellZo Access', desc: 'Full platform for you & family' },
];

export const CareersPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedDept, setSelectedDept] = useState('All');
  const depts = ['All', ...new Set(positions.map(p => p.department))];
  const filtered = selectedDept === 'All' ? positions : positions.filter(p => p.department === selectedDept);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <SEO title="Careers at WellZo - Join Our Team" description="Join WellZo in Bengaluru. Building the future of HR technology for Indian SMBs." keywords="WellZo careers, jobs Bengaluru, HR tech jobs" />
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
            <span className="font-bold">WellZo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/features" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium">Features</Link>
            <Link to="/blog" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium">Blog</Link>
            <Button variant="premium" size="sm" onClick={() => navigate('/pricing')}>Start Free Trial</Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 bg-gradient-to-b from-neutral-950 via-brand-950 to-neutral-950 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-brand-500/20 rounded-full blur-[100px]" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            className="text-brand-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">Join Us</motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-6xl font-extrabold mb-6 text-white">
            Build the Future of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-teal-400">HR Technology</span>
          </AnimatedText>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            We are on a mission to simplify HR and payroll for every Indian business. Join us in Bengaluru.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[{ icon: Users, value: '10K+', label: 'Businesses Served' }, { icon: MapPin, value: 'Bengaluru', label: 'Headquarters' }, { icon: Heart, value: '100+', label: 'Team Members' }].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <stat.icon size={24} className="mx-auto text-brand-500 mb-3" />
                <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-neutral-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-extrabold mb-4">Why Join WellZo?</h2>
            <p className="text-neutral-500 mb-10">We are building category-defining HR software for the Indian market. Every team member makes a direct impact on thousands of businesses.</p>
            <div className="grid md:grid-cols-3 gap-6">
              {benefits.map((b, i) => { const Icon = b.icon; return (
                <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="flex gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-500 flex items-center justify-center shrink-0"><Icon size={20} /></div>
                  <div><p className="font-bold text-sm text-neutral-900 dark:text-white">{b.title}</p><p className="text-xs text-neutral-500 mt-0.5">{b.desc}</p></div>
                </motion.div>
              );})}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold mb-4">Open Positions</h2>
            <p className="text-neutral-500 mb-8">All roles are based in Bengaluru, India. Remote-friendly.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {depts.map(d => (
                <button key={d} onClick={() => setSelectedDept(d)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedDept === d ? 'bg-brand-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{d}</button>
              ))}
            </div>
            <div className="space-y-4">
              {filtered.map(pos => (
                <motion.div key={pos.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-elev-3 hover:border-brand-200 dark:hover:border-brand-800 transition-all group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{pos.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-neutral-500">
                        <span className="flex items-center gap-1"><Briefcase size={12} />{pos.department}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} />{pos.location}</span>
                        <span className="flex items-center gap-1"><Clock size={12} />{pos.type}</span>
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold">{pos.experience}</span>
                      </div>
                    </div>
                    <a href={`mailto:careers@wellzo.in?subject=Applying for ${pos.title}`}
                      className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-colors text-center shrink-0 inline-flex items-center gap-1">
                      Apply Now <ArrowRight size={14} />
                    </a>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 mb-3">{pos.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {pos.requirements.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-medium">{r}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
              {filtered.length === 0 && <p className="text-center text-neutral-400 py-12">No open positions in this department</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
