import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Zap, Shield, Sparkles, Store, ShoppingBag, Factory, Tent } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const logos = [
  { name: 'BharatTech', icon: Building2 },
  { name: 'QuickSettle', icon: Zap },
  { name: 'SafeHands', icon: Shield },
  { name: 'UrbanCraft', icon: Sparkles },
  { name: 'GreenField', icon: Factory },
  { name: 'EComNext', icon: ShoppingBag },
  { name: 'RiseUp', icon: Tent },
  { name: 'RetailMax', icon: Store },
];

export const TrustBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-6">
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.2em] mb-10">
          {t('marketing.trustBar.title')}
        </motion.p>

        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-neutral-50 dark:from-neutral-900/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-neutral-50 dark:from-neutral-900/50 to-transparent z-10" />
          <motion.div className="flex gap-16 items-center" animate={{ x: [0, -1920] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
            {[...logos, ...logos].map((logo, i) => (
              <div key={i} className="flex items-center gap-3 text-neutral-400 dark:text-neutral-500 shrink-0">
                <logo.icon size={24} />
                <span className="text-lg font-bold whitespace-nowrap">{logo.name}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          {t('marketing.trustBar.stats', { returnObjects: true }).map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
