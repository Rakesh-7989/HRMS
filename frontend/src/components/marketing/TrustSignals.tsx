import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Server, Lock, Award, BadgeCheck, FileCheck } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';

const trustItems = [
  {
    icon: Shield,
    title: 'SOC 2 Type II Certified',
    description: 'Enterprise-grade security with annual audits. Your data is protected with industry-leading controls.',
    color: 'text-brand-500',
    bgColor: 'bg-brand-50 dark:bg-brand-900/20',
    borderColor: 'border-brand-200 dark:border-brand-800',
  },
  {
    icon: Server,
    title: 'Data Stored in India',
    description: 'All employee data hosted on Indian servers (AWS Mumbai). Compliant with Indian data localisation laws.',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    icon: Lock,
    title: '256-bit AES Encryption',
    description: 'End-to-end encryption for all data in transit and at rest. Aadhaar-grade security standards.',
    color: 'text-coral-500',
    bgColor: 'bg-coral-50 dark:bg-coral-900/20',
    borderColor: 'border-coral-200 dark:border-coral-800',
  },
  {
    icon: Award,
    title: 'ISO 27001 Certified',
    description: 'International standard for information security management. Certified for data protection.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    icon: BadgeCheck,
    title: 'GST Registered',
    description: 'Fully compliant GST-registered business. All invoices include valid GSTIN for input credit.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    icon: FileCheck,
    title: 'DPDP Act 2023 Ready',
    description: 'Compliant with India\'s Digital Personal Data Protection Act. Privacy-by-design architecture.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
];

export const TrustSignals: React.FC = () => {
  return (
    <section className="py-24 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-brand-500 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            Security & Compliance
          </motion.span>
          <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-neutral-900 dark:text-white">
            Your Data,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-teal-500">
              Secured & Compliant
            </span>
          </AnimatedText>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
            We meet the highest security standards so you can focus on your business with peace of mind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:shadow-elev-4 hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mt-16 p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Need a Compliance Report?</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Download our SOC 2, ISO 27001 reports, or DPDP compliance whitepaper.</p>
            </div>
            <button className="px-6 py-3 bg-brand-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-600 transition-colors shrink-0">
              Request Compliance Docs
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
