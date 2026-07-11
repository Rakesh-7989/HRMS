import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, IndianRupee, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
          {t('marketing.cta.badge')}
        </motion.span>

        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
          {t('marketing.cta.headline')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-teal-300">
            {t('marketing.cta.headlineAccent')}
          </span>
        </motion.h2>

        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="text-neutral-300 text-lg max-w-2xl mx-auto mb-10">
          {t('marketing.cta.subtext')}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex_row items-center justify-center gap-4 mb-12">
          <Button size="xl" variant="premium" className="rounded-xl px-10 group" onClick={() => navigate('/pricing')}>
            {t('marketing.cta.ctaPrimary')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button size="xl" variant="outline" className="rounded-xl px-10 border-white/20 text-white hover:bg-white/10" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('marketing.cta.ctaSecondary')}
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-6 text-sm text-neutral-300">
          {[
            { icon: Shield, text: t('marketing.cta.badge1') },
            { icon: IndianRupee, text: t('marketing.cta.badge2') },
            { icon: CheckCircle, text: t('marketing.cta.badge3') },
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
