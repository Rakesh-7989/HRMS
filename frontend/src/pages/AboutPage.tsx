import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Target, Heart, Shield, ArrowRight } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const team = [
  { name: 'Arun Mehta', role: 'CEO & Co-Founder', avatar: 'AM', color: 'from-brand-500 to-brand-700', bio: 'Ex-Zoho, 15+ years in HR tech' },
  { name: 'Divya Rao', role: 'CTO & Co-Founder', avatar: 'DR', color: 'from-teal-500 to-teal-700', bio: 'Ex-Microsoft, AI/ML specialist' },
  { name: 'Vikram Singh', role: 'Head of Product', avatar: 'VS', color: 'from-coral-500 to-coral-700', bio: 'Ex-Freshworks, product-led growth' },
  { name: 'Neha Gupta', role: 'Head of Compliance', avatar: 'NG', color: 'from-amber-500 to-amber-700', bio: 'Chartered Accountant, 12+ years' },
];

const milestones = [
  { year: '2020', event: 'WellZo founded in Bengaluru' },
  { year: '2021', event: 'First 100 customers onboarded' },
  { year: '2022', event: 'Launched PF/ESI compliance engine' },
  { year: '2023', event: 'Crossed 5,000 SMBs, Series A funding' },
  { year: '2024', event: 'AI features launch, 10,000+ customers' },
  { year: '2025', event: 'SOC 2 certified, expanded to Middle East' },
];

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <SEO
        title={t('marketing.about.pageTitle')}
        description={t('marketing.about.sectionSubtitle')}
        keywords="About WellZo, Indian HRMS company, HR software India, Bengaluru startup"
      />
      {/* Hero */}
      <section className="relative py-32 bg-gradient-to-b from-neutral-950 via-brand-950 to-neutral-950 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-brand-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            className="text-brand-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            About WellZo
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-6xl font-extrabold mb-6 text-white">
            HR & Payroll,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-teal-400">
              {t('marketing.about.sectionTitleAccent')}
            </span>
          </AnimatedText>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto leading-relaxed">
            {t('marketing.about.sectionSubtitle')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Target, title: t('marketing.about.values[0]'), desc: t('marketing.about.values[1]') },
              { icon: Heart, title: t('marketing.about.values[2]'), desc: t('marketing.about.values[3]') },
              { icon: Shield, title: t('marketing.about.values[4]'), desc: t('marketing.about.values[5]') },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-500 flex items-center justify-center mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center mb-16">{t('marketing.about.journeyTitle')}</h2>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-brand-500 via-teal-500 to-brand-500 hidden md:block" />
            <div className="space-y-12">
              {milestones.map((m, i) => (
                <motion.div key={m.year} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="relative pl-20 md:pl-24">
                  <div className="absolute left-4 md:left-6 top-1 w-8 h-8 rounded-full bg-white dark:bg-neutral-950 border-2 border-brand-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                  </div>
                  <span className="text-brand-500 font-black text-sm">{m.year}</span>
                  <p className="text-neutral-700 dark:text-neutral-300 mt-1">{m.event}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center mb-4">{t('marketing.about.teamTitle')}</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-center mb-16 max-w-xl mx-auto">
            {t('marketing.about.teamSubtitle')}
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div key={member.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center group">
                <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white font-bold text-xl mb-4 group-hover:scale-110 transition-transform`}>
                  {member.avatar}
                </div>
                <h3 className="font-bold text-lg">{member.name}</h3>
                <p className="text-brand-500 text-sm font-semibold">{member.role}</p>
                <p className="text-neutral-400 text-xs mt-1">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-brand-900 to-neutral-950 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">{t('marketing.about.ctaTitle')}</h2>
          <p className="text-neutral-300 mb-8">Join 10,000+ Indian businesses using WellZo.</p>
          <Button variant="premium" size="xl" onClick={() => navigate('/pricing')}>
            {t('marketing.about.ctaButton')} <ArrowRight size={20} />
          </Button>
        </div>
      </section>
    </div>
  );
};
