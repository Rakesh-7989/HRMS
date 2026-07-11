import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Server, Lock, Award, BadgeCheck, FileCheck } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

const trustItems = [
  {
    icon: Shield,
    titleKey: 'marketing.trustSignals.items[0].title',
    descriptionKey: 'marketing.trustSignals.items[0].description',
    color: 'text-brand-500',
    bgColor: 'bg-brand-50 dark:bg-brand-900/20',
    borderColor: 'border-brand-200 dark:border-brand-800',
  },
  {
    icon: Server,
    titleKey: 'marketing.trustSignals.items[1].title',
    descriptionKey: 'marketing.trustSignals.items[1].description',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    icon: Lock,
    titleKey: 'marketing.trustSignals.items[2].title',
    descriptionKey: 'marketing.trustSignals.items[2].description',
    color: 'text-coral-500',
    bgColor: 'bg-coral-50 dark:bg-coral-900/20',
    borderColor: 'border-coral-200 dark:border-coral-800',
  },
  {
    icon: Award,
    titleKey: 'marketing.trustSignals.items[3].title',
    descriptionKey: 'marketing.trustSignals.items[3].description',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    icon: BadgeCheck,
    titleKey: 'marketing.trustSignals.items[4].title',
    descriptionKey: 'marketing.trustSignals.items[4].description',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    icon: FileCheck,
    titleKey: 'marketing.trustSignals.items[5].title',
    descriptionKey: 'marketing.trustSignals.items[5].description',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
];

export const TrustSignals: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-brand-500 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            {t('marketing.trustSignals.sectionLabel')}
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-neutral-900 dark:text-white">
            {t('marketing.trustSignals.sectionTitle')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-teal-500">
              {t('marketing.trustSignals.sectionTitleAccent')}
            </span>
          </AnimatedText>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
            {t('marketing.trustSignals.sectionSubtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.titleKey} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:shadow-elev-4 hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {t(item.titleKey)}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{t(item.descriptionKey)}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mt-16 p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">{t('marketing.trustSignals.ctaTitle')}</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('marketing.trustSignals.ctaSubtext')}</p>
            </div>
            <Button variant="primary">
              {t('marketing.trustSignals.ctaButton')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
