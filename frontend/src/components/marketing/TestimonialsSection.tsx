import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, Building2 } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';

export const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation();

  const testimonials = [
    {
      name: t('marketing.testimonials.items[0].author'),
      role: t('marketing.testimonials.items[0].role'),
      company: t('marketing.testimonials.items[0].company'),
      location: t('marketing.testimonials.items[0].location'),
      avatar: 'AS',
      avatarColor: 'from-brand-500 to-brand-700',
      quote: t('marketing.testimonials.items[0].quote'),
      rating: 5,
      industry: t('marketing.testimonials.industries[0]'),
      metric: t('marketing.testimonials.items[0].metric'),
    },
    {
      name: t('marketing.testimonials.items[1].author'),
      role: t('marketing.testimonials.items[1].role'),
      company: t('marketing.testimonials.items[1].company'),
      location: t('marketing.testimonials.items[1].location'),
      avatar: 'RV',
      avatarColor: 'from-teal-500 to-teal-700',
      quote: t('marketing.testimonials.items[1].quote'),
      rating: 5,
      industry: t('marketing.testimonials.industries[1]'),
      metric: t('marketing.testimonials.items[1].metric'),
    },
    {
      name: t('marketing.testimonials.items[2].author'),
      role: t('marketing.testimonials.items[2].role'),
      company: t('marketing.testimonials.items[2].company'),
      location: t('marketing.testimonials.items[2].location'),
      avatar: 'PP',
      avatarColor: 'from-coral-500 to-coral-700',
      quote: t('marketing.testimonials.items[2].quote'),
      rating: 5,
      industry: t('marketing.testimonials.industries[2]'),
      metric: t('marketing.testimonials.items[2].metric'),
    },
    {
      name: t('marketing.testimonials.items[3].author'),
      role: t('marketing.testimonials.items[3].role'),
      company: t('marketing.testimonials.items[3].company'),
      location: t('marketing.testimonials.items[3].location'),
      avatar: 'SK',
      avatarColor: 'from-amber-500 to-amber-700',
      quote: t('marketing.testimonials.items[3].quote'),
      rating: 5,
      industry: t('marketing.testimonials.industries[3]'),
      metric: t('marketing.testimonials.items[3].metric'),
    },
  ];

  return (
    <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-brand-500 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            {t('marketing.testimonials.sectionLabel')}
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-neutral-900 dark:text-white">
            {t('marketing.testimonials.sectionTitle')} {' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-teal-500">
              {t('marketing.testimonials.sectionTitleAccent')}
            </span>
          </AnimatedText>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
            {t('marketing.testimonials.sectionSubtitle')}
          </p>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="inline-flex items-center gap-3 mt-6 px-6 py-3 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-elev-1">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (<Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />))}
            </div>
            <span className="font-bold text-neutral-900 dark:text-white">{t('marketing.testimonials.g2Rating')}</span>
            <span className="text-neutral-400 text-sm">{t('marketing.testimonials.g2Count')}</span>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, i) => (
            <motion.div key={testimonial.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }}
              className="relative group rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-elev-5 hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-300"
            >
              <Quote size={20} className="absolute top-4 right-4 text-brand-200 dark:text-brand-800" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (<Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />))}
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                  {testimonial.metric}
                </span>
              </div>

              <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed text-sm">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0', testimonial.avatarColor)}>
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white text-sm">{testimonial.name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs">{testimonial.role}, {testimonial.company}</p>
                  <p className="text-neutral-400 dark:text-neutral-500 text-[10px]">{testimonial.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-neutral-500">
          {(t('marketing.testimonials.industries', { returnObjects: true }) as string[]).map((industry, index) => (
            <span key={index} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <Building2 size={14} className="text-neutral-400" />
              {industry}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
