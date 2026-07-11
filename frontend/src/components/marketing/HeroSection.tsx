import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Shield, CheckCircle, IndianRupee, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { useNavigate } from 'react-router-dom';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const indiaTrustSignals = [
  { icon: Shield, label: 'PF/ESI/PT/LWF Compliant' },
  { icon: CheckCircle, label: 'Aadhaar & PAN Verified' },
  { icon: IndianRupee, label: 'New Tax Regime Ready' },
  { icon: Building2, label: 'Made for Indian SMBs' },
];

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-neutral-950 via-brand-950 to-neutral-950">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-brand-500/5 via-brand-500/5 to-teal-500/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/0 via-neutral-950/50 to-neutral-950" />
      </div>

      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <div className="w-full max-w-5xl glass-strong rounded-2xl shadow-elev-6">
          <div className="px-6 py-3 flex items-center justify-between">
            <motion.div className="flex items-center gap-3 cursor-pointer" whileHover={{ scale: 1.05 }}>
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
              <span className="text-white font-bold text-lg">WellZo</span>
            </motion.div>
            <div className="hidden md:flex items-center gap-4">
              <button onClick={() => navigate('/features')} className="text-neutral-300 hover:text-white transition-colors text-sm font-medium px-3 py-2">Features</button>
              <button onClick={() => navigate('/pricing')} className="text-neutral-300 hover:text-white transition-colors text-sm font-medium px-3 py-2">Pricing</button>
              <button onClick={() => navigate('/about')} className="text-neutral-300 hover:text-white transition-colors text-sm font-medium px-3 py-2">About</button>
              <div className="h-6 w-px bg-white/10 mx-2" />
              <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10" onClick={() => navigate('/login')}>Sign In</Button>
              <Button variant="premium" size="sm" onClick={() => navigate('/pricing')}>Start Free Trial <ArrowRight size={16} /></Button>
            </div>
          </div>
        </div>
      </nav>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-xl">
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-[0.2em]">
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                India's #1 HRMS for SMBs
              </span>
            </motion.div>

            <AnimatedText variant="slide-up" className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 text-white">
              HR & Payroll{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-teal-400 to-brand-300">
                Built for India
              </span>
            </AnimatedText>

            <AnimatedText variant="fade-in" delay={0.4} className="text-lg text-neutral-400 max-w-lg mb-6 leading-relaxed">
              Full-featured HRMS with PF, ESI, PT, LWF, and Form 16 compliance. 
              Automate attendance, leave, payroll, and performance — so you can focus on growing your business.
            </AnimatedText>

            {/* India Trust Signals */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-2 mb-8">
              {indiaTrustSignals.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2 text-xs text-neutral-300">
                    <Icon size={14} className="text-teal-400 shrink-0" />
                    {s.label}
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <Button size="xl" variant="premium" className="rounded-xl px-8 group" onClick={() => navigate('/pricing')}>
                Start Free Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="xl" variant="outline" className="rounded-xl px-8 border-white/10 text-white hover:bg-white/10">
                <Play size={20} /> Watch Demo
              </Button>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-10 flex items-center gap-8">
              <div className="flex -space-x-2">
                {[
                  { bg: 'from-brand-400 to-brand-600', initials: 'TC' },
                  { bg: 'from-teal-400 to-teal-600', initials: 'SB' },
                  { bg: 'from-coral-400 to-coral-600', initials: 'PV' },
                  { bg: 'from-amber-400 to-amber-600', initials: 'RM' },
                ].map((a, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-neutral-800 bg-gradient-to-br ${a.bg} flex items-center justify-center text-white text-xs font-bold`}>
                    {a.initials}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white font-bold text-lg">10K+</p>
                <p className="text-neutral-400 text-sm">SMBs across India</p>
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeInUp} className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-elev-6 shadow-brand-500/20 border border-white/10">
              <div className="aspect-[4/3] bg-gradient-to-br from-brand-900/50 via-neutral-900 to-neutral-950 relative overflow-hidden">
                <div className="absolute inset-0 p-6">
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-white/5 border-r border-white/10 flex flex-col items-center py-4 gap-4">
                    {[...Array(6)].map((_, i) => (<div key={i} className="w-8 h-8 rounded-lg bg-white/10" />))}
                  </div>
                  <div className="absolute top-0 left-16 right-0 h-14 bg-white/5 border-b border-white/10 flex items-center px-4 gap-3">
                    <div className="w-32 h-3 bg-white/20 rounded" />
                    <div className="ml-auto flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10" />
                      <div className="w-8 h-8 rounded-full bg-brand-500/50" />
                    </div>
                  </div>
                  <div className="absolute top-14 left-16 right-0 bottom-0 p-4 grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((_, i) => (
                      <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                        <div className="w-16 h-2 bg-white/20 rounded" />
                        <div className="w-24 h-4 bg-white/30 rounded" />
                        <div className="w-full h-16 bg-gradient-to-t from-brand-500/10 to-transparent rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent" />
              </div>
            </div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-elev-5">
              <p className="text-white text-sm font-semibold">🇮🇳 100% Made in India</p>
            </motion.div>
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -left-4 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-elev-5">
              <p className="text-white text-sm font-semibold">⭐ 4.9/5 G2 Rating</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
