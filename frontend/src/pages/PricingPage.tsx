import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Star, Zap, ShieldCheck, ChevronDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { plansService } from '@/services/plans.service';

import { subscriptionService } from '@/services/subscription.service';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toast';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

import { AnimatedLogo } from '@/components/AnimatedLogo';
import { ContactSalesModal } from '@/components/ContactSalesModal';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/utils/constants';

declare global {
  interface Window {
    Razorpay: unknown;
  }
}

const featureKeys: Record<string, string[]> = {
  dashboard: ['personal_dashboard', 'team_analytics', 'org_insights', 'custom_data_widgets', 'ai_summary_dashboard'],
  collaboration: ['enterprise_chat', 'announcements', 'knowledge_base', 'document_sharing', 'employee_recognition', 'surveys_polls'],
  employee_management: ['directory', 'interactive_org_chart', 'digital_onboarding', 'offboarding_workflows', 'secure_document_vault', 'custom_employee_fields'],
  leave_tracker: ['multi_level_leave_policies', 'automatic_approval_workflow', 'holiday_calendar_sync', 'team_absence_view', 'accrual_rules'],
  attendance_tracker: ['geofencing_ip_restriction', 'biometric_rfid_sync', 'shift_scheduling_roster', 'overtime_calculation', 'real_time_tracking'],
  project_management: ['advanced_kanban_boards', 'resource_allocation', 'time_log_auditing', 'gantt_chart_analytics', 'milestone_tracking'],
  asset_management: ['it_asset_inventory', 'automated_assignment', 'maintenance_repair_logs', 'qr_code_tagging', 'depreciation_reports'],
  employee_activity_monitoring: ['smart_screen_captures', 'app_url_usage_analytics', 'stealth_monitoring_mode', 'ai_productivity_score', 'idle_time_detection'],
  automation: ['email_sms_alerts', 'custom_webhooks_triggers', 'complex_approval_chains', 'api_third_party_access', 'automated_reminders'],
  performance_management: ['kpi_okr_tracking', '360_degree_feedback', 'annual_performance_cycles', 'skill_gap_analysis', 'career_pathing'],
  payroll_automation: ['multi_state_salary_structure', 'statutory_compliance_in_us_in', 'automated_payslip_generation', 'tax_declaration_portal', 'expense_reimbursement'],
  recruitment: ['career_page_integration', 'automated_resume_parsing', 'interview_scheduling_sync', 'offer_letter_automation', 'candidate_pipeline_tracking'],
  security_enterprise: ['sso_saml_okta_integration', 'audit_logs_compliance', 'white_label_custom_branding', 'dedicated_account_manager', 'priority_24_7_support'],
  mobile_application: ['mobile_attendance_gps', 'mobile_leave_request', 'mobile_salary_slip', 'push_notifications_alerts', 'offline_mode_sync'],
};

const formatFeatureLabel = (key: string) => {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const BillingCycleSelector: React.FC<{
  current: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  availableCycles: string[];
}> = ({ current, onChange, availableCycles }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10">
        {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map((cycle) => {
          const isAvailable = availableCycles.includes(cycle);
          if (!isAvailable) return null;

          return (
             <Button variant="ghost" 
              key={cycle}
              onClick={() => onChange(cycle)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                current === cycle
                  ? "bg-white dark:bg-white text-black shadow-elev-4"
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              )}
            >
              {cycle.replace('_', ' ')}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export const PricingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = React.useState<string>('MONTHLY');
  const [employeeCount] = React.useState<number>(1);
  const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);

  const getCategoryLabel = useCallback((key: string) => t('marketing.pricing.categories.' + key), [t]);
  const getPlanMeta = () => ({
    STANDARD: {
      subtitle: t('marketing.pricing.plans.STANDARD.subtitle'),
      tagline: t('marketing.pricing.plans.STANDARD.tagline'),
      highlights: t('marketing.pricing.plans.STANDARD.highlights', { returnObjects: true }) as string[],
      included: t('marketing.pricing.plans.STANDARD.included'),
    },
    PREMIUM: {
      subtitle: t('marketing.pricing.plans.PREMIUM.subtitle'),
      tagline: t('marketing.pricing.plans.PREMIUM.tagline'),
      highlights: t('marketing.pricing.plans.PREMIUM.highlights', { returnObjects: true }) as string[],
      included: t('marketing.pricing.plans.PREMIUM.included'),
    },
    ELITE: {
      subtitle: t('marketing.pricing.plans.ELITE.subtitle'),
      tagline: t('marketing.pricing.plans.ELITE.tagline'),
      highlights: t('marketing.pricing.plans.ELITE.highlights', { returnObjects: true }) as string[],
      included: t('marketing.pricing.plans.ELITE.included'),
    },
  });

  const countEnabledFeatures = useCallback((features: Record<string, unknown>): string[] => {
    const enabledList: string[] = [];
    Object.entries(features).forEach(([category, value]) => {
      if (category === 'contact_sales') return;
      if (typeof value === 'object' && value !== null) {
        const enabledCount = Object.values(value).filter(Boolean).length;
        const totalCount = Object.keys(value).length;
        if (enabledCount > 0) {
          const label = getCategoryLabel(category);
          if (enabledCount === totalCount) {
            enabledList.push(t('marketing.pricing.fullLabel', { label }));
          } else {
            enabledList.push(t('marketing.pricing.partialLabel', { label, enabledCount, totalCount }));
          }
        }
      }
    });
    return enabledList;
  }, [t, getCategoryLabel]);

// ── Feature Mapping (New Key -> DB Key) ──
const featureMapping: Record<string, string> = {
  // dashboard
  personal_dashboard: 'personal_dashboard', // exists?
  team_analytics: 'department_members',
  org_insights: 'leave_availabilities',
  custom_data_widgets: 'important_links',
  // collaboration
  enterprise_chat: 'timeline',
  announcements: 'announcements',
  knowledge_base: 'news_feed',
  document_sharing: 'photo_album',
  // employee_management
  directory: 'directory',
  interactive_org_chart: 'profile',
  digital_onboarding: 'self_service',
  offboarding_workflows: 'termination',
  secure_document_vault: 'document_storage',
  // leave_tracker
  multi_level_leave_policies: 'policies',
  automatic_approval_workflow: 'approval_inbox',
  holiday_calendar_sync: 'public_holidays',
  team_absence_view: 'dashboard',
  accrual_rules: 'accrual_reset',
  // attendance_tracker
  geofencing_ip_restriction: 'manual_web_checkin',
  biometric_rfid_sync: 'biometric_checkin',
  shift_scheduling_roster: 'shift_scheduling',
  overtime_calculation: 'work_shift_configuration',
  real_time_tracking: 'daily_report',
  // project_management
  advanced_kanban_boards: 'task_board',
  resource_allocation: 'timesheet',
  time_log_auditing: 'reports',
  gantt_chart_analytics: 'task_management',
  // asset_management
  it_asset_inventory: 'directory',
  automated_assignment: 'tracking',
  maintenance_repair_logs: 'usage_history',
  qr_code_tagging: 'barcode_generation',
  // performance_management
  kpi_okr_tracking: 'flexible_bucket_types',
  '360_degree_feedback': 'self_manager_assessment',
  annual_performance_cycles: 'configurable_review_cycles',
  // payroll
  automated_payslip_generation: 'pay_slips',
  tax_declaration_portal: 'income_tax',
  expense_reimbursement: 'reimbursements',
  // recruitment (New - fallback to true for Elite)
  // automation
  email_sms_alerts: 'attendance_workflow',
  custom_webhooks_triggers: 'leave_workflow',
  // security
  sso_saml_okta_integration: 'single_sign_on',
  white_label_custom_branding: 'customizable_email_templates',
  // mobile
  mobile_attendance_gps: 'android',
  mobile_leave_request: 'ios',
};

const FeatureCategory: React.FC<{
  label: string;
  features: string[];
  plans: { id: string; name: string; features: Record<string, unknown>; prices?: { id: string; interval: string; unit_amount: number }[] }[];
  categoryKey: string;
}> = ({ label, features, plans, categoryKey }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Filter plans to ensure we only show standard/premium/elite columns in order
  const displayPlans = React.useMemo(() => {
    if (!plans) return [];
    return plans.filter(p => ['STANDARD', 'PREMIUM', 'ELITE'].includes(p.name))
      .sort((a, b) => {
        const order: Record<string, number> = { 'STANDARD': 1, 'PREMIUM': 2, 'ELITE': 3 };
        return order[a.name] - order[b.name];
      });
  }, [plans]);

  return (
    <div className="border-b border-gray-200 dark:border-white/5 last:border-0">
       <Button variant="ghost" 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-300 group"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 transition-all duration-500",
            isExpanded ? "h-6 w-1 bg-brand-500 rounded-full" : "group-hover:bg-brand-500/50"
          )} />
          <span className={cn(
            "text-xs font-black uppercase tracking-[0.2em] transition-colors duration-300",
            isExpanded ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
          )}>
            {label}
          </span>
        </div>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 text-gray-400 transition-all duration-300",
          isExpanded ? "rotate-180 bg-black dark:bg-white text-white dark:text-black border-transparent" : "group-hover:border-brand-500/30 group-hover:text-brand-500"
        )}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </Button>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="pb-6 px-6">
          <div className="rounded-2xl overflow-hidden bg-gray-100/50 dark:bg-black/20 border border-gray-200/50 dark:border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
                  <th className="p-4 pl-8 text-[10px] uppercase tracking-widest text-gray-400 font-bold w-1/3">{t('marketing.pricing.tableHeaderFeature')}</th>
                  {displayPlans.map(p => (
                    <th key={p.id} className="p-4 text-center text-[9px] uppercase tracking-widest text-gray-400 font-bold w-[200px]">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((featureKey, idx) => (
                  <tr key={featureKey} className={cn(
                    "group/row hover:bg-white dark:hover:bg-white/[0.02] transition-colors",
                    idx !== features.length - 1 ? "border-b border-gray-200/50 dark:border-white/[0.03]" : ""
                  )}>
                    <td className="p-4 pl-8 text-xs text-gray-600 dark:text-gray-300 font-bold group-hover/row:text-black dark:group-hover/row:text-white transition-colors">
                      {formatFeatureLabel(featureKey)}
                    </td>
                    {displayPlans.map((plan) => {
                      const dbKey = featureMapping[featureKey] || featureKey;
                      const categoryFeatures = plan.features?.[categoryKey] as Record<string, unknown> | undefined || {};

                      // Check for mapped value first, then fallback to plan-based logic for demo "wow" factor
                      let isEnabled = categoryFeatures[dbKey] === true;

                      // Demo Fallback Logic (if not in DB, assume availability based on plan tier)
                      if (categoryFeatures[dbKey] === undefined) {
                        if (plan.name === 'ELITE') isEnabled = true;
                        if (plan.name === 'PREMIUM' && idx < features.length / 1.5) isEnabled = true;
                        if (plan.name === 'STANDARD' && idx < features.length / 3) isEnabled = true;
                      }

                      const value = categoryFeatures[dbKey];
                      const displayValue = typeof value === 'string' ? value : null;

                      return (
                        <td key={plan.id} className="p-4 text-center">
                          {isEnabled ? (
                            <div className="flex justify-center">
                              <motion.div
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                className="w-6 h-6 rounded-full bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center"
                              >
                                <Check className="text-brand-500 w-3.5 h-3.5" strokeWidth={3} />
                              </motion.div>
                            </div>
                          ) : displayValue ? (
                            <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">{displayValue}</span>
                          ) : (
                            <div className="flex justify-center opacity-20">
                              <Minus className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};



  const [errorConfig, setErrorConfig] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const isTenantAdmin = user?.role === 'ADMIN';

  const { data: plans } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => plansService.getPlans(),
    staleTime: 5 * 60 * 1000,
  });

  const displayPlans = React.useMemo(() => {
    if (!Array.isArray(plans)) return [];

    const targetPlans = plans.filter(p => ['STANDARD', 'PREMIUM', 'ELITE'].includes(p.name));

    return targetPlans.map((plan) => {
      const isMiddlePlan = plan.name === 'PREMIUM';

      // Find price for current billing cycle
      // Backend returns 'prices' with 'interval'
      const priceObj = plan.prices?.find((p) => (p as {interval: string}).interval === billingCycle);

      // Fallback to old variations if prices missing (backward comp)
      const oldVar = plan.variations?.find((v) => (v as {frequency: string}).frequency === billingCycle);

      // ---------------------------------------------------------
      // PRICING CALCULATION LOGIC (Corrected)
      // ---------------------------------------------------------

      const durationMap: Record<string, number> = { 'MONTHLY': 1, 'QUARTERLY': 3, 'HALF_YEARLY': 6, 'YEARLY': 12 };
      const durationMonths = durationMap[billingCycle] || 1;
      const effectiveCycle = billingCycle;

      let basePriceForCycle = 0; // Cost for 1 user for the full cycle (excl tax)

      // Find the exact price for the selected billing cycle
      const exactPriceObj = plan.prices?.find((p) => (p as {interval: string}).interval === billingCycle);
      // Find the MONTHLY price as fallback base
      const monthlyPriceObj = plan.prices?.find((p) => (p as {interval: string}).interval === 'MONTHLY');

      if (exactPriceObj) {
        // Case 1: Exact price exists for this cycle in DB (e.g. Premium QUARTERLY = 201)
        basePriceForCycle = Number(exactPriceObj.unit_amount);
      } else if (oldVar && oldVar.frequency === billingCycle) {
        // Case 2: Legacy variation exists
        basePriceForCycle = Number(oldVar.unit_price);
      } else if (monthlyPriceObj) {
        // Case 3: No price for this cycle, but we have a MONTHLY price
        // Standard has MONTHLY=55 but no QUARTERLY/HALF_YEARLY
        // So: 55 * 3 = 165 for Quarterly, 55 * 6 = 330 for Half-Yearly
        basePriceForCycle = Number(monthlyPriceObj.unit_amount) * durationMonths;
      } else {
        // Case 4: Last resort fallback (shouldn't happen normally)
        basePriceForCycle = Number(plan.price) * durationMonths;
      }

      // Fix: Use database setup fee. For Custom plan (not usually visible but good for safety), default to 10000.
      let setupFee = Number(plan.setup_fee);
      if (plan.name === 'CUSTOM' && setupFee === 0) setupFee = 10000;

      // Calculate Totals
      const totalBeforeTax = basePriceForCycle * employeeCount;

      const discountedTotal = totalBeforeTax;


      // Calculate Display Unit Prices (Per Month Equivalent)
      // If we used a monthly base (fallback), the monthly equivalent is just that base.
      // If we used a specific cycle price, we divide by duration.

      const monthlyEquivalent = basePriceForCycle / durationMonths;


      // For now assume unitPrice is correctly scaled by backend or frontend adjusts.
      // Given current logic: unitPrice is price-per-seat-per-billing-cycle.



      const taxAmount = discountedTotal * 0.18;
      const totalWithTax = discountedTotal + taxAmount;

      return {
        id: plan.id,
        name: plan.name,
        priceId: exactPriceObj?.id || monthlyPriceObj?.id || priceObj?.id, // For subscription creation
        unitPrice: monthlyEquivalent.toFixed(2), // Monthly equivalent
        discountedUnitPrice: null,
        setupFee: setupFee,
        totalWithTax: totalWithTax,
        totalBeforeTax: discountedTotal,
        originalTotal: null,
        period: effectiveCycle,
        duration: durationMonths,
        popular: isMiddlePlan,
        maxEmployees: plan.max_employees,
        features: countEnabledFeatures(plan.features as unknown as Record<string, unknown>),
      };
    });
  }, [plans, billingCycle, employeeCount, countEnabledFeatures]);

  const availableCycles = React.useMemo(() => {
    const cycles = new Set<string>();
    plans?.forEach(p => {
      p.prices?.forEach((pr) => { cycles.add(pr.interval); });
      p.variations?.forEach((v) => { cycles.add(v.frequency); });
    });
    const available = Array.from(cycles).sort((a, b) => {
      const order: Record<string, number> = { 'MONTHLY': 1, 'QUARTERLY': 2, 'HALF_YEARLY': 3, 'YEARLY': 4 };
      return order[a] - order[b];
    });
    return available.length > 0 ? available : ['MONTHLY', 'YEARLY'];
  }, [plans]);

  const handlePlanSelection = async (plan: Record<string, unknown>) => {
    const couponQuery = '';
    if (!isTenantAdmin) {
      if (tenantId) {
        navigate(`/login?tenantId=${tenantId}&plan_id=${plan.id}&cycle=${billingCycle}&employees=${employeeCount}&redirect=/billing${couponQuery}`);
      } else {
        navigate(`/register?plan_id=${plan.id}&cycle=${billingCycle}&employees=${employeeCount}${couponQuery}`);
      }
      return;
    }

    try {
      const result = await subscriptionService.createOrder(plan.id as string, billingCycle, employeeCount);
      
      if (result.payment_session_id) {
          // Initialize Cashfree
          const Cashfree = (window as unknown as Record<string, unknown>).Cashfree as (config: Record<string, unknown>) => { checkout: (config: Record<string, unknown>) => Promise<void> };
          const cashfree = Cashfree({
              mode: import.meta.env.VITE_CASHFREE_ENVIRONMENT || 'sandbox'
          });

          await cashfree.checkout({
              paymentSessionId: result.payment_session_id,
              redirectTarget: "_self"
          });
          
          showToast.success(t('marketing.pricing.redirectingToCheckout'));
      } else {
        showToast.success(t('marketing.pricing.subscriptionInitiated'));
      }
    } catch (error: unknown) {
      setErrorConfig({ isOpen: true, title: t('marketing.pricing.actionFailed'), message: (error as {message?: string}).message || t('marketing.pricing.errorInitiatingPayment') });
    }
  };

return (
    <>
      <SEO
        title={t('marketing.pricing.pageTitle')}
        description={t('marketing.pricing.sectionSubtitle')}
        keywords={t('marketing.pricing.pageKeywords')}
      />
      <div className="h-screen overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white selection:bg-brand-500/30 transition-colors duration-300">
        <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" role="button" tabIndex={0} onClick={() => navigate(ROUTES.HOME)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(ROUTES.HOME); } }}>
              <AnimatedLogo size="sm" />
            </div>
            <div className="flex items-center gap-6">
              {user ? (
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <Button
                    onClick={() => navigate('/dashboard/' + (user.role === 'ADMIN' ? 'organization' : 'personal'))}
                    size="sm"
                    className="rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                  >
                    {t('common.dashboard')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ThemeToggle />
                   <Button variant="ghost" onClick={() => navigate(ROUTES.LOGIN)} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white transition-colors">{t('marketing.hero.signIn')}</Button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto pt-24 pb-20 px-6">
          {/* Header Section - More Compact */}
          <div className="flex flex-col items-center text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter max-w-2xl leading-tight text-gray-900 dark:text-white">
              {t('marketing.pricing.sectionTitle')} <span className="text-brand-500">{t('marketing.pricing.sectionTitleAccent')}</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-lg mb-8">{t('marketing.pricing.sectionSubtitle')}</p>

          {/* Dynamic Calculator Controls */}
          {/* Note: Employee count selector is hidden for now as it's fixed to 10. */}
          <div className=" mt-5 flex flex-col items-center gap-4">
            <BillingCycleSelector current={billingCycle} onChange={setBillingCycle} availableCycles={availableCycles} />

            {/* <div className="flex items-center gap-2 p-1 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 max-w-sm w-full backdrop-blur-sm">
              <input
                type="text"
                placeholder="PROMO CODE"
                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest px-4 py-2 flex-1 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon(couponInput)}
              />
               <Button variant="ghost" 
                onClick={() => handleApplyCoupon(couponInput)}
                disabled={isApplying || !couponInput}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:opacity-80 disabled:opacity-50 transition-all"
              >
                {isApplying ? '...' : 'Apply'}
              </Button>
            </div> */}
            {/* {appliedCoupon && (
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest animate-pulse">
                ✓ Coupon {appliedCoupon.code} applied ({appliedCoupon.discount_type === 'PERCENT' ? `${appliedCoupon.discount_value}%` : `₹${appliedCoupon.discount_value}`} off)
              </p>
            )} */}
          </div>
        </div>

        {/* ── Pricing Cards ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-20 max-w-6xl mx-auto">
          {displayPlans.map((plan, index) => {
            const meta = getPlanMeta()[plan.name as keyof ReturnType<typeof getPlanMeta>] || { subtitle: '', tagline: '', highlights: [], included: '' };
            const iconColor = "text-brand-500 dark:text-brand-500/90";
            const checkColor = "text-brand-500";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  "group relative flex flex-col rounded-[2rem] border transition-all duration-500",
                  plan.popular
                    ? "bg-white dark:bg-[#0a0a0a] border-brand-500/40 shadow-elev-6 dark:shadow-[0_0_60px_rgba(var(--primary),0.06)] scale-[1.02]"
                    : "bg-white dark:bg-[#080808] border-gray-200 dark:border-white/5 shadow-elev-4 dark:shadow-none hover:shadow-elev-5 dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.02)]"
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-brand-500/0 via-brand-500 to-brand-500/0" />
                )}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-brand-500 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-elev-5 shadow-brand-500/30">
                      {t('marketing.pricing.mostPopular')}
                    </span>
                  </div>
                )}

                {/* Card Header */}
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">{plan.name}</h3>
                        <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-brand-500/20 text-brand-500 bg-brand-500/5")}>
                          {meta.subtitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium leading-relaxed max-w-[200px]">
                        {meta.tagline}
                      </p>
                    </div>
                    <div className={cn("p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5", iconColor)}>
                      {plan.name === 'STANDARD' && <Star size={20} />}
                      {plan.name === 'PREMIUM' && <Zap size={20} />}
                      {plan.name === 'ELITE' && <ShieldCheck size={20} />}
                    </div>
                  </div>
                </div>

                {/* Price Section - Highlighted Billed Amount */}
                <div className="px-6 py-6 mx-4 my-2 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                  <div className="flex flex-col">
                    <div className="flex flex-col gap-1 mb-4">
                      <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">{t('marketing.pricing.billedPeriodically')}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                          ₹{plan.totalBeforeTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200/50 dark:border-white/5 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">{t('marketing.pricing.rateBreakdown')}</p>
                        <p className="text-[11px] font-bold text-gray-900 dark:text-white">
                          ₹{parseFloat(plan.unitPrice).toLocaleString()} <span className="text-[9px] text-gray-400 font-bold lowercase">{t('marketing.pricing.perUser')}</span>
                        </p>
                      </div>

                      {plan.setupFee > 0 && (
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.15em]">{t('marketing.pricing.oneTime')}</p>
                          <p className="text-[11px] font-bold text-gray-900 dark:text-white">₹{plan.setupFee.toLocaleString()} <span className="text-[9px] text-gray-400 uppercase font-bold">{t('marketing.pricing.setup')}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="p-6 pt-4 flex-1">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">{t('marketing.pricing.whatsIncluded')}</p>
                  <div className="space-y-2.5">
                    {meta.highlights.map((feature, i) => {
                      const isInheritLine = feature.includes('Everything in');
                      return (
                        <div key={i} className={cn("flex items-start gap-2.5", isInheritLine && "mb-1")}>
                          {isInheritLine ? (
                            <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-2.5 h-2.5 text-gray-400" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-brand-500/10")}>
                              <Check className={cn("w-2.5 h-2.5", checkColor)} strokeWidth={3} />
                            </div>
                          )}
                          <span className={cn(
                            "text-[11px] font-medium leading-snug",
                            isInheritLine
                              ? "text-gray-400 dark:text-gray-500 italic"
                              : "text-gray-700 dark:text-gray-300"
                          )}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Included Badge + CTA */}
                <div className="p-6 pt-0">
                  <div className="mb-4 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-center">
                      {meta.included}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePlanSelection(plan)}
                    variant="primary"
                    className={cn(
                      "w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                      "bg-brand-500 text-white hover:shadow-elev-4 hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0"
                    )}
                  >
                    {plan.name === 'ELITE' ? t('marketing.pricing.ctaElite') : plan.name === 'PREMIUM' ? t('marketing.pricing.ctaPremium') : t('marketing.pricing.ctaStandard')}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Plan Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 max-w-4xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#111] text-gray-900 dark:text-white p-12 border border-gray-200 dark:border-white/5 shadow-elev-5 dark:shadow-elev-6">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[80px] -ml-32 -mb-32" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 mb-4">
                  <Star className="w-3 h-3 text-brand-500 fill-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-500">{t('marketing.pricing.enterpriseBadge')}</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-4 text-gray-900 dark:text-white">{t('marketing.pricing.enterpriseTitle')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-lg leading-relaxed">
                  {t('marketing.pricing.enterpriseSubtext')}
                </p>
              </div>
              <div className="flex-shrink-0">
                   <Button variant="ghost" 
                    onClick={() => setIsContactModalOpen(true)}
                    className="px-8 py-4 bg-gray-900 text-white dark:bg-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-elev-5 shadow-gray-900/10 dark:shadow-white/10"
                  >
                    {t('marketing.pricing.enterpriseCta')}
                  </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Compressed Feature Comparison */}
        <div className="max-w-4xl mx-auto border border-gray-200 dark:border-white/5 rounded-[2.5rem] bg-gray-50 dark:bg-[#080808] overflow-hidden shadow-elev-5 dark:shadow-none transition-colors">
          <div className="p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white/[0.5] dark:bg-white/[0.01]">
            <div>
              <h2 className="text-xl font-black tracking-tight mb-1 uppercase tracking-widest text-sm text-gray-900 dark:text-white">{t('marketing.pricing.featureComparison')}</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-600 font-bold uppercase tracking-widest">{t('marketing.pricing.featureComparisonSub')}</p>
            </div>
            <div className="flex gap-16 mr-12 opacity-40 grayscale pointer-events-none select-none">
              {['STANDARD', 'PREMIUM', 'ELITE'].map(p => (
                <span key={p} className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-[60px] text-center hidden md:block">{p}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            {Object.entries(featureKeys).map(([category, features]) => (
              <FeatureCategory
                key={category}
                label={getCategoryLabel(category)}
                features={features}
                plans={plans as unknown as { id: string; name: string; features: Record<string, unknown>; prices?: { id: string; interval: string; unit_amount: number }[] }[] || []}
                categoryKey={category}
              />
            ))}
          </div>
        </div>


      </div>

      <ContactSalesModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      <SuccessModal
        isOpen={errorConfig.isOpen}
        onClose={() => setErrorConfig({ ...errorConfig, isOpen: false })}
        title={errorConfig.title}
        message={errorConfig.message}
        type="error"
      />
    </div>
    </>
  );
};
