import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, ArrowUpRight, Shield, IndianRupee } from 'lucide-react';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Payroll', to: '/features#payroll' },
      { label: 'Attendance', to: '/features#attendance' },
      { label: 'Leave Management', to: '/features#leave' },
      { label: 'Statutory Compliance', to: '/features#statutory' },
      { label: 'Performance Mgmt', to: '/features#performance' },
      { label: 'Recruitment ATS', to: '/features#recruitment' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', to: '#' },
      { label: 'API Documentation', to: '#' },
      { label: 'Compliance Guide', to: '#' },
      { label: 'Form 16 Help', to: '#' },
      { label: 'PF/ESI Calculator', to: '#' },
      { label: 'Release Notes', to: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Careers', to: '#' },
      { label: 'Blog', to: '#' },
      { label: 'Privacy Policy', to: '#' },
      { label: 'Terms of Service', to: '#' },
      { label: 'G2 Reviews', to: '#' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'sales@wellzo.in', to: 'mailto:sales@wellzo.in' },
      { label: '+91-804-XXX-XXXX', to: 'tel:+91804XXXXXXX' },
      { label: 'Bengaluru, India', to: '#' },
      { label: 'Support Portal', to: '#' },
    ],
  },
];

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative bg-neutral-950 border-t border-neutral-800">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <motion.div className="col-span-2 md:col-span-1" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
              <span className="text-white font-bold text-lg">WellZo</span>
            </div>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              India's most trusted HR & payroll platform for SMBs. 100% Made in India.
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
              <h4 className="text-white font-bold text-sm mb-4">{group.title}</h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to}
                      className="text-neutral-400 hover:text-white transition-colors text-sm flex items-center gap-1 group/link">
                      {link.label}
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
              SOC 2 Type II Certified
            </div>
            <div className="flex items-center gap-2 text-neutral-500 text-xs">
              <IndianRupee size={12} />
              Data stored in India
            </div>
          </div>
          <p className="text-neutral-500 text-xs">
            © 2025 WellZo. All rights reserved. Made with ❤️ in Bengaluru, India.
          </p>
        </div>
      </div>
    </footer>
  );
};
