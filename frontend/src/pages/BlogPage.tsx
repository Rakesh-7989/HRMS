import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, Calendar, Clock, ArrowRight, Tag, ChevronRight } from 'lucide-react';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { useTranslation } from 'react-i18next';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
}

const posts: BlogPost[] = [
  {
    slug: 'pf-compliance-guide',
    title: 'PF Compliance Guide: Everything Indian SMBs Need to Know',
    excerpt: 'A comprehensive guide to PF compliance for Indian businesses. Learn about PF ECR filing, contribution rates, and common mistakes to avoid.',
    content: 'Employees\' Provident Fund (EPF) is a mandatory social security scheme in India...',
    category: 'Compliance',
    author: 'Neha Gupta',
    date: '2025-12-15',
    readTime: '8 min read',
    image: 'PF',
  },
  {
    slug: 'esi-registration-process',
    title: 'ESI Registration & Return Filing: Step-by-Step Guide',
    excerpt: 'Complete walkthrough of ESI registration process, monthly return filing, and how WellZo automates it all.',
    content: 'Employee State Insurance (ESI) is a self-financing social security...',
    category: 'Compliance',
    author: 'Neha Gupta',
    date: '2025-11-28',
    readTime: '6 min read',
    image: 'ESI',
  },
  {
    slug: 'form-16-generation',
    title: 'Form 16 Generation Made Easy: Automate Tax Slips for Employees',
    excerpt: 'How to generate Form 16 automatically, handle new vs old tax regime, and ensure error-free tax deductions.',
    content: 'Form 16 is one of the most critical documents for employees...',
    category: 'Payroll',
    author: 'Arun Mehta',
    date: '2025-11-10',
    readTime: '5 min read',
    image: 'F16',
  },
  {
    slug: 'new-tax-regime-vs-old',
    title: 'New vs Old Tax Regime: A Guide for HR Teams',
    excerpt: 'Help your employees choose between new and old tax regimes. Understand the implications for TDS deduction.',
    content: 'With the new tax regime now being the default...',
    category: 'Payroll',
    author: 'Arun Mehta',
    date: '2025-10-22',
    readTime: '7 min read',
    image: 'TAX',
  },
  {
    slug: 'geofencing-attendance',
    title: 'Geo-Fencing Attendance: The Complete Guide for Remote Teams',
    excerpt: 'How geo-fencing attendance works, implementation best practices, and how Indian companies are using it.',
    content: 'Geo-fencing creates virtual boundaries around your office...',
    category: 'Product',
    author: 'Divya Rao',
    date: '2025-10-05',
    readTime: '6 min read',
    image: 'GEO',
  },
  {
    slug: 'ai-in-hr-transformation',
    title: 'How AI is Transforming HR in Indian SMBs',
    excerpt: 'From resume parsing to sentiment analysis, discover how AI-powered HR tools are changing the game for Indian businesses.',
    content: 'Artificial Intelligence is reshaping how Indian SMBs handle HR...',
    category: 'HR Tech',
    author: 'Divya Rao',
    date: '2025-09-18',
    readTime: '9 min read',
    image: 'AI',
  },
  {
    slug: 'employee-engagement-strategies',
    title: '7 Employee Engagement Strategies for Growing Indian Companies',
    excerpt: 'Practical engagement strategies for SMBs, from peer recognition to pulse surveys and celebration automation.',
    content: 'Employee engagement is critical for retention...',
    category: 'HR Tips',
    author: 'Vikram Singh',
    date: '2025-09-01',
    readTime: '7 min read',
    image: 'EE',
  },
  {
    slug: 'leave-management-best-practices',
    title: 'Leave Management Best Practices for Indian Employers',
    excerpt: 'Everything about leave policies, accruals, carry forward, and compliance with Indian labour laws.',
    content: 'Managing leave across different states in India...',
    category: 'HR Tips',
    author: 'Ananya Sharma',
    date: '2025-08-15',
    readTime: '6 min read',
    image: 'LM',
  },
];

const categories = ['All', 'Compliance', 'Payroll', 'Product', 'HR Tech', 'HR Tips'];

const imageColors: Record<string, string> = {
  PF: 'from-brand-500 to-brand-700',
  ESI: 'from-teal-500 to-teal-700',
  F16: 'from-coral-500 to-coral-700',
  TAX: 'from-amber-500 to-amber-700',
  GEO: 'from-brand-600 to-teal-600',
  AI: 'from-purple-500 to-brand-600',
  EE: 'from-coral-600 to-amber-600',
  LM: 'from-teal-600 to-brand-500',
};

export const BlogListPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  const filtered = posts.filter(p => {
    if (category !== 'All' && p.category !== category) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.excerpt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <SEO title={t('marketing.blog.pageTitle')} description={t('marketing.blog.sectionSubtitle')} keywords="HR blog India, payroll compliance, PF ESI guide, Form 16, HR technology" />

      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
            <span className="font-bold">WellZo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/features" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium">{t('marketing.nav.features')}</Link>
            <Link to="/pricing" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium">{t('marketing.nav.pricing')}</Link>
            <Button variant="premium" size="sm" onClick={() => navigate('/pricing')}>{t('marketing.hero.ctaPrimary')}</Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-16 bg-gradient-to-b from-neutral-950 via-brand-950 to-neutral-950">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <AnimatedText variant="slide-up" className="text-4xl md:text-5xl font-extrabold mb-6 text-white">
            {t('marketing.blog.sectionTitle')} {' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-teal-400">
              {t('marketing.blog.sectionTitleAccent')}
            </span>
          </AnimatedText>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto mb-8">
            {t('marketing.blog.sectionSubtitle')}
          </p>
          <div className="max-w-md mx-auto relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" placeholder={t('marketing.blog.searchPlaceholder')}
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:border-brand-500/50 text-sm" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
             <Button variant="ghost" key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                category === cat
                  ? 'bg-brand-500 text-white shadow-elev-2'
                  : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-brand-300'
              }`}>
              {cat === 'All' ? t('common.all') : cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-neutral-400">
            <p className="text-lg font-medium">No articles found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((post, i) => (
              <motion.article key={post.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-elev-4 hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-300">
                <Link to={`/blog/${post.slug}`}>
                  <div className={`h-40 bg-gradient-to-br ${imageColors[post.image] || 'from-brand-500 to-teal-500'} flex items-center justify-center`}>
                    <span className="text-4xl font-black text-white/30">{post.image}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold">{post.category}</span>
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400"><Clock size={10} />{post.readTime}</span>
                    </div>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">{post.date}</span>
                      <span className="text-xs font-bold text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                        Read <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = posts.find(p => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <p className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Post not found</p>
          <Link to="/blog" className="text-brand-500 text-sm">Back to blog</Link>
        </div>
      </div>
    );
  }

  const related = posts.filter(p => p.category === post.category && p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <SEO title={`${post.title} - WellZo Blog`} description={post.excerpt} keywords={`${post.category.toLowerCase()}, ${post.title.toLowerCase()}`} />

      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">W</div>
            <span className="font-bold">WellZo</span>
          </Link>
          <Link to="/blog" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium">← Back to Blog</Link>
        </div>
      </nav>

      <article className="pt-24 pb-16 max-w-3xl mx-auto px-6">
        <div className="mb-8">
          <Link to="/blog" className="text-xs text-neutral-400 hover:text-brand-500 flex items-center gap-1 mb-4">
            <ChevronRight size={12} className="rotate-180" /> Back to Blog
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold">{post.category}</span>
            <span className="flex items-center gap-1 text-xs text-neutral-400"><Calendar size={12} />{post.date}</span>
            <span className="flex items-center gap-1 text-xs text-neutral-400"><Clock size={12} />{post.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4">{post.title}</h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400">{post.excerpt}</p>
        </div>

        <div className={`h-64 md:h-80 rounded-2xl bg-gradient-to-br ${imageColors[post.image] || 'from-brand-500 to-teal-500'} flex items-center justify-center mb-10`}>
          <span className="text-6xl font-black text-white/20">{post.image}</span>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
            This article is part of our ongoing series on HR and compliance for Indian businesses. 
            Stay tuned for the full content. In the meantime, explore our related articles below.
          </p>
          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mt-8">
            <h3 className="font-bold text-neutral-900 dark:text-white mb-2">About the Author</h3>
            <p className="text-sm text-neutral-500">{post.author} — {post.category} expert at WellZo</p>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16 pt-12 border-t border-neutral-200 dark:border-neutral-800">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.slug} to={`/blog/${r.slug}`}
                  className="group p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-elev-2 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold">{r.category}</span>
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white group-hover:text-brand-600 transition-colors">{r.title}</h3>
                  <p className="text-[11px] text-neutral-400 mt-1">{r.date}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};
