import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, IndianRupee, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-950 to-neutral-950" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-semibold uppercase tracking-[0.2em] mb-6">
          <Building2 size={14} />
          Built for Indian SMBs
        </motion.span>

        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
          From Payroll to Compliance —{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-teal-300">
            We've Got India Covered
          </span>
        </motion.h2>

        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="text-neutral-300 text-lg max-w-2xl mx-auto mb-10">
          14-day free trial. No credit card needed. Full access to all features including PF/ESI compliance.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button size="xl" variant="premium" className="rounded-xl px-10 group" onClick={() => navigate('/pricing')}>
            Start Free Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button size="xl" variant="outline" className="rounded-xl px-10 border-white/20 text-white hover:bg-white/10">
            Talk to Sales
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-6 text-sm text-neutral-300">
          {[
            { icon: Shield, text: 'PF/ESI/PT/LWF Compliant' },
            { icon: IndianRupee, text: 'Form 16 Auto-Generation' },
            { icon: CheckCircle, text: 'No Credit Card Required' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.text} className="flex items-center gap-2">
                <Icon size={16} className="text-teal-400" />
                {item.text}
              </span>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
