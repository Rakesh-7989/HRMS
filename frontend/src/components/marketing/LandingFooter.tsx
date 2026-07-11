import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, ArrowUpRight, Shield, IndianRupee } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const footerLinks = [
  {
    title: 'marketing.footer.product',
    links: [
      { label: 'marketing.footer.productLinks.payroll', to: '/features#payroll' },
      { label: 'marketing.footer.productLinks.attendance', to: '/features#attendance' },
      { label: 'marketing.footer.productLinks.leave', to: '/features#leave' },
      { label: 'marketing.footer.productLinks.statutory', to: '/features#statutory' },
      { label: 'marketing.footer.productLinks.performance', to: '/features#performance' },
      { label: 'marketing.footer.productLinks.recruitment', to: '/features#recruitment' },
      { label: 'marketing.footer.productLinks.pricing', to: '/pricing' },
    ],
  },
  {
    title: 'marketing.footer.resources',
    links: [
      { label: 'marketing.footer.resourceLinks.help', to: '#' },
      { label: 'marketing.footer.resourceLinks.api', to: '#' },
      { label: 'marketing.footer.resourceLinks.compliance', to: '#' },
      { label: 'marketing.footer.resourceLinks.form16', to: '#' },
      { label: 'marketing.footer.resourceLinks.calculator', to: '#' },
      { label: 'marketing.footer.resourceLinks.releases', to: '#' },
    ],
  },
  {
    title: 'marketing.footer.company',
    links: [
      { label: 'marketing.footer.companyLinks.about', to: '/about' },
      { label: 'marketing.footer.companyLinks.careers', to: '/careers' },
      { label: 'marketing.footer.companyLinks.blog', to: '/blog' },
      { label: 'marketing.footer.companyLinks.privacy', to: '#' },
      { label: 'marketing.footer.companyLinks.terms', to: '#' },
      { label: 'marketing.footer.companyLinks.g2', to: '#' },
    ],
  },
  {
    title: 'marketing.footer.contact',
    links: [
      { label: 'marketing.footer.contactLinks.email', to: 'mailto:sales@wellzo.in' },
      { label: 'marketing.footer.contactLinks.phone', to: 'tel:+91804XXXXXXX' },
      { label: 'marketing.footer.contactLinks.address', to: '#' },
      { label: 'marketing.footer.contactLinks.support', to: '#' },
    ],
  },
];

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer id="contact" className="relative bg-neutral-950 border-t border-neutral-800">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <motion.div className="col-span-2 md:col-span-1" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
              <span className="text-white font-bold text-lg">WellZo</span>
            </div>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              {t('marketing.footer.tagline')}
            </p>
            <div className="space-y-2 text-neutral-500 text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={12} />
                <span>Bengaluru, Karnataka, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} />
                <span>sales@wellzo.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={12} />
                <span>+91-804-XXX-XXXX</span>
              </div>
            </div>
          </motion.div>

          {footerLinks.map((group) => (
            <motion.div key={group.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <h4 className="text-white font-bold text-sm mb-4">{t(group.title)}</h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to}
                      className="text-neutral-400 hover:text-white transition-colors text-sm flex items-center gap-1 group/link">
                      {t(link.label)}
                      {link.to.startsWith('mailto:') || link.to.startsWith('tel:') ? (
                        <ArrowUpRight size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-neutral-500 text-xs">
              <Shield size={12} />
              {t('marketing.footer.badgeSoc2')}
            </div>
            <div className="flex items-center gap-2 text-neutral-500 text-xs">
              <IndianRupee size={12} />
              {t('marketing.footer.badgeData')}
            </div>
          </div>
          <p className="text-neutral-500 text-xs">
            © {new Date().getFullYear()} {t('marketing.footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};
