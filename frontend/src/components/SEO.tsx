import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

const BASE_TITLE = 'WellZo - HR & Payroll Platform for Indian SMBs';
const BASE_DESCRIPTION = 'Full-featured HRMS with PF, ESI, PT, LWF, and Form 16 compliance. Automate attendance, leave, payroll, and performance for Indian businesses.';

export const SEO: React.FC<SEOProps> = ({ title, description, keywords, ogImage }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title ? `${title} | WellZo` : BASE_TITLE;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (name.startsWith('og:')) {
          el.setAttribute('property', name);
        } else {
          el.setAttribute('name', name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description || BASE_DESCRIPTION);
    if (keywords) setMeta('keywords', keywords);
    setMeta('og:title', title || BASE_TITLE);
    setMeta('og:description', description || BASE_DESCRIPTION);
    setMeta('og:url', `https://wellzo.in${pathname}`);
    if (ogImage) setMeta('og:image', ogImage);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title || BASE_TITLE);
    setMeta('twitter:description', description || BASE_DESCRIPTION);
  }, [title, description, keywords, ogImage, pathname]);

  return null;
};
