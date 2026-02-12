import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Star, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { plansService } from '@/services/plans.service';

import { subscriptionService } from '@/services/subscription.service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import logo from '../../Assests/light-logo.png'; // Verifying path below

declare global {
  interface Window {
    Razorpay: any;
  }
}

const categoryLabels: Record<string, string> = {
  // ... (keep categories)
  dashboard: 'Core HR & Dashboards',
  collaboration: 'Collaboration Tools',
  employee_management: 'Employee Management',
  leave_tracker: 'Leave & Time Off',
  attendance_tracker: 'Attendance Tracking',
  project_management: 'Project & Workspace',
  asset_management: 'Asset Management',
  employee_activity_monitoring: 'Activity Monitoring',
  automation: 'Workflow Automation',
  performance_management: 'Performance Management',
  payroll_automation: 'Payroll Automation',
  mobile_application: 'Mobile Solutions',
  other_features: 'Additional Capabilities',
};

const featureKeys: Record<string, string[]> = {
  dashboard: ['personal_dashboard', 'team_dashboard', 'org_dashboard', 'custom_widgets'],
  collaboration: ['chat', 'announcements', 'knowledge_base', 'document_sharing'],
  employee_management: ['directory', 'org_chart', 'onboarding', 'offboarding', 'document_vault'],
  leave_tracker: ['leave_policies', 'approval_workflow', 'holiday_calendar', 'team_view'],
  attendance_tracker: ['geofencing', 'ip_restriction', 'biometric_sync', 'shift_management'],
  project_management: ['kanban_boards', 'task_tracking', 'time_logs', 'gantt_charts'],
  asset_management: ['inventory', 'assignment', 'maintenance', 'depreciation'],
  employee_activity_monitoring: ['screen_captures', 'app_usage', 'idle_time', 'productivity_score'],
  automation: ['email_alerts', 'custom_triggers', 'approval_chains', 'api_access'],
  performance_management: ['kpi_tracking', '360_feedback', 'appraisal_cycles', 'skill_mapping'],
  payroll_automation: ['salary_structure', 'statutory_compliance', 'payslip_generation', 'tax_declaration'],
  mobile_application: ['mobile_attendance', 'mobile_leave', 'mobile_payslips', 'push_notifications'],
  other_features: ['multi_tenant', 'custom_branding', 'priority_support', 'dedicated_manager'],
};

const formatFeatureLabel = (key: string) => {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Helper to count enabled features in a plan
const countEnabledFeatures = (features: Record<string, any>): string[] => {
  const enabledList: string[] = [];

  Object.entries(features).forEach(([category, value]) => {
    if (category === 'contact_sales') return;

    if (typeof value === 'object' && value !== null) {
      const enabledCount = Object.values(value).filter(Boolean).length;
      const totalCount = Object.keys(value).length;
      if (enabledCount > 0) {
        const label = categoryLabels[category] || category.replace(/_/g, ' ');
        if (enabledCount === totalCount) {
          enabledList.push(`Full ${label}`);
        } else {
          enabledList.push(`${label} (${enabledCount}/${totalCount})`);
        }
      }
    }
  });

  return enabledList;
};


const BillingCycleSelector: React.FC<{
  current: string;
  onChange: (cycle: any) => void;
  availableCycles: string[];
}> = ({ current, onChange, availableCycles }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex p-1 bg-[#1a1a1a] rounded-xl border border-white/10">
        {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map((cycle) => {
          const isAvailable = availableCycles.includes(cycle);
          if (!isAvailable) return null;

          return (
            <button
              key={cycle}
              onClick={() => onChange(cycle)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                current === cycle
                  ? "bg-white text-black shadow-lg"
                  : "text-gray-500 hover:text-white"
              )}
            >
              {cycle.replace('_', ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FeatureCategory: React.FC<{
  label: string;
  features: string[];
  plans: any[];
  categoryKey: string;
}> = ({ label, features, plans, categoryKey }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-px h-4 bg-primary transition-all duration-300",
            isExpanded ? "h-6" : "h-4"
          )} />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
            {label}
          </span>
        </div>
        <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
          <Check className="w-4 h-4 text-gray-600" />
        </div>
      </button>

      {isExpanded && (
        <div className="bg-black/20">
          <table className="w-full text-left">
            <tbody>
              {features.map((featureKey) => (
                <tr key={featureKey} className="border-t border-white/[0.03] hover:bg-white/[0.01]">
                  <td className="p-4 px-8 text-xs text-gray-500 font-medium">
                    {formatFeatureLabel(featureKey)}
                  </td>
                  {plans?.map((plan) => {
                    const categoryFeatures = (plan.features as any)?.[categoryKey] || {};
                    const isEnabled = categoryFeatures[featureKey] === true;
                    return (
                      <td key={plan.id} className="p-4 text-center w-[200px]">
                        {isEnabled ? (
                          <div className="flex justify-center">
                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                              <Check className="text-primary" size={10} strokeWidth={4} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-800 font-bold">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const PricingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const couponCodeParam = searchParams.get('coupon');
  console.log('PricingPage params:', { tenantId, params: Object.fromEntries(searchParams) });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = React.useState<string>('MONTHLY');
  const [employeeCount] = React.useState<number>(1);
  const [couponInput, setCouponInput] = React.useState<string>('');
  const [isApplying, setIsApplying] = React.useState(false);
  const showTax = true; // Always show inclusive price as per new design

  const [appliedCoupon, setAppliedCoupon] = React.useState<any>(null);

  React.useEffect(() => {
    if (couponCodeParam) {
      setCouponInput(couponCodeParam);
      handleApplyCoupon(couponCodeParam);
    }
  }, [couponCodeParam]);

  const handleApplyCoupon = async (code: string) => {
    if (!code) return;
    setIsApplying(true);
    try {
      const res = await subscriptionService.validateCoupon(code);
      if (res.success && res.data) {
        setAppliedCoupon(res.data);
        toast.success(`Coupon '${res.data.code}' applied!`);
      } else {
        toast.error(res.message || 'Invalid or expired coupon');
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to apply coupon');
      setAppliedCoupon(null);
    } finally {
      setIsApplying(false);
    }
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
      const priceObj = plan.prices?.find((p: any) => p.interval === billingCycle) ||
        plan.prices?.[0];

      // Fallback to old variations if prices missing (backward comp)
      const oldVar = plan.variations?.find((v: any) => v.frequency === billingCycle);

      const effectiveCycle = priceObj?.interval || oldVar?.frequency || 'MONTHLY';

      // Fix: Use Number() instead of parseFloat for type safety
      let unitPrice = priceObj ? Number(priceObj.unit_amount) : (oldVar ? Number(oldVar.unit_price) : Number(plan.price));

      // Fix 4c: Standard plan setup fee (Default to 5000 if not in database)
      let setupFee = Number(plan.setup_fee);
      if (plan.name === 'STANDARD' && setupFee === 0) setupFee = 5000;


      const durationMap: Record<string, number> = { 'MONTHLY': 1, 'QUARTERLY': 3, 'HALF_YEARLY': 6, 'YEARLY': 12 };
      const durationMonths = durationMap[effectiveCycle] || 1;

      // Calculate Base Total
      let totalBeforeTax = unitPrice * employeeCount;
      // Note: If unitPrice is already full duration price (e.g. Yearly 540), do NOT multiply by months again?
      // For now assume unitPrice is correctly scaled by backend or frontend adjusts.
      // Given current logic: unitPrice is price-per-seat-per-billing-cycle.

      let discountAmount = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'PERCENT') {
          discountAmount = (totalBeforeTax * appliedCoupon.discount_value) / 100;
        } else if (appliedCoupon.discount_type === 'FIXED') {
          discountAmount = appliedCoupon.discount_value;
        }
        // Cap discount?
        discountAmount = Math.min(discountAmount, totalBeforeTax);
      }

      const discountedTotal = totalBeforeTax - discountAmount;

      // Display logic:
      // Unit Price (per month equivalent): price / duration
      // If we have a discount, show discounted unit price? 
      // Or just total?
      // Let's adjust total.

      const monthlyEquivalent = unitPrice / durationMonths;
      const discountedMonthly = (discountedTotal / employeeCount) / durationMonths;

      const taxAmount = discountedTotal * 0.18;
      const totalWithTax = discountedTotal + taxAmount;

      return {
        id: plan.id,
        name: plan.name,
        priceId: priceObj?.id, // Need this for subscription creation
        unitPrice: monthlyEquivalent.toFixed(2), // Original per month
        discountedUnitPrice: appliedCoupon ? discountedMonthly.toFixed(2) : null,
        setupFee: setupFee,
        totalWithTax: totalWithTax,
        totalBeforeTax: discountedTotal,
        originalTotal: appliedCoupon ? (unitPrice * employeeCount) : null,
        period: effectiveCycle,
        duration: durationMonths,
        popular: isMiddlePlan,
        maxEmployees: plan.max_employees,
        features: countEnabledFeatures(plan.features),
      };
    });
  }, [plans, billingCycle, employeeCount, appliedCoupon]);

  const availableCycles = React.useMemo(() => {
    const cycles = new Set<string>();
    plans?.forEach(p => {
      p.prices?.forEach((pr: any) => cycles.add(pr.interval));
      p.variations?.forEach((v: any) => cycles.add(v.frequency));
    });
    const available = Array.from(cycles).sort((a, b) => {
      const order: any = { 'MONTHLY': 1, 'QUARTERLY': 2, 'HALF_YEARLY': 3, 'YEARLY': 4 };
      return order[a] - order[b];
    });
    return available.length > 0 ? available : ['MONTHLY', 'YEARLY'];
  }, [plans]);

  const handlePlanSelection = async (plan: any) => {
    const couponQuery = appliedCoupon ? `&coupon=${appliedCoupon.code}` : '';
    if (!isTenantAdmin) {
      if (tenantId) {
        navigate(`/login?tenantId=${tenantId}&plan_id=${plan.id}&cycle=${billingCycle}&employees=${employeeCount}&redirect=/billing${couponQuery}`);
      } else {
        navigate(`/register?plan_id=${plan.id}&cycle=${billingCycle}&employees=${employeeCount}${couponQuery}`);
      }
      return;
    }

    try {
      // Use new Create Subscription Flow
      const result = await subscriptionService.createSubscription({
        planId: plan.id,
        priceId: plan.priceId,
        quantity: employeeCount,
        couponCode: appliedCoupon?.code
      });

      if (result.authLink) {
        // Redirect to Cashfree Mandate Auth
        window.location.href = result.authLink;
      } else {
        toast.success('Subscription initiated!');
        // navigate('/dashboard/billing');
      }
    } catch (error: any) {
      setErrorConfig({ isOpen: true, title: 'Action Failed', message: error.message || 'Error initiating payment' });
    }
  };

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#050505] text-white selection:bg-primary/30">
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logo} alt="WellZo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <button onClick={() => navigate('/dashboard/' + (user.role === 'ADMIN' ? 'organization' : 'personal'))} className="px-5 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all">
                  Dashboard
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ThemeToggle />
                <button onClick={() => navigate('/login')} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Login</button>
                <button onClick={() => navigate('/register')} className="px-5 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all">Start Free</button>
              </div>
            )}

          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto pt-24 pb-20 px-6">
        {/* Header Section - More Compact */}
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter max-w-2xl leading-tight">
            Plans built for <span className="text-primary">hyper-growth</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-lg mb-8">Scale your HR presence with surgical precision and dynamic per-user pricing.</p>

          {/* Dynamic Calculator Controls */}
          {/* Note: Employee count selector is hidden for now as it's fixed to 10. */}
          <div className=" mt-5 flex flex-col items-center gap-4">
            <BillingCycleSelector current={billingCycle} onChange={setBillingCycle} availableCycles={availableCycles} />

            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 max-w-sm w-full">
              <input
                type="text"
                placeholder="PROMO CODE"
                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest px-4 py-2 flex-1"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon(couponInput)}
              />
              <button
                onClick={() => handleApplyCoupon(couponInput)}
                disabled={isApplying || !couponInput}
                className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all"
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>
            {appliedCoupon && (
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest animate-pulse">
                ✓ Coupon {appliedCoupon.code} applied ({appliedCoupon.discount_type === 'PERCENT' ? `${appliedCoupon.discount_value}%` : `₹${appliedCoupon.discount_value}`} off)
              </p>
            )}
          </div>
        </div>

        {/* Pricing Cards - Compressed & Tactical */}
        <div className="grid md:grid-cols-3 gap-5 mb-16 max-w-6xl mx-auto">
          {displayPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex flex-col p-6 rounded-[2rem] border transition-all duration-500",
                plan.popular ? "bg-[#0d0d0d] border-primary/50 shadow-2xl" : "bg-[#080808] border-white/5"
              )}
            >
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Popular Choice</div>}

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tight mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", plan.discountedUnitPrice ? "text-gray-400 line-through Decoration-gray-500" : "text-gray-500")}>
                      ₹{plan.unitPrice}/user
                    </p>
                    {plan.discountedUnitPrice && (
                      <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                        ₹{plan.discountedUnitPrice}/user
                      </p>
                    )}
                  </div>
                </div>
                <div className={cn("p-2 rounded-xl bg-white/5", plan.name === 'ELITE' ? "text-amber-400" : plan.name === 'PREMIUM' ? "text-primary" : "text-gray-400")}>
                  {plan.name === 'STANDARD' && <Star size={18} />}
                  {plan.name === 'PREMIUM' && <Zap size={18} />}
                  {plan.name === 'ELITE' && <ShieldCheck size={18} />}
                </div>
              </div>

              <div className="mb-8 border-y border-white/[0.03] py-6 flex flex-col items-center">
                {plan.originalTotal && (
                  <div className="text-sm text-gray-500 line-through font-bold mb-1">
                    ₹{(plan.originalTotal * (showTax ? 1.18 : 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
                <div className="text-4xl font-black tracking-tighter mb-1">
                  ₹{(showTax ? plan.totalWithTax : plan.totalBeforeTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Total for {plan.duration} month{plan.duration > 1 ? 's' : ''}</p>
                {plan.setupFee > 0 && <p className="text-[9px] text-primary-light mt-2 font-bold uppercase tracking-tighter">+ ₹{plan.setupFee.toLocaleString()} setup fee (per user)</p>}
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {plan.features.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="text-primary w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] text-gray-400 font-medium">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePlanSelection(plan)}
                className={cn(
                  "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  plan.popular ? "bg-primary text-black hover:opacity-90" : "bg-white/5 text-white hover:bg-white/10"
                )}
              >
                Choose {plan.name}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Compressed Feature Comparison */}
        <div className="max-w-4xl mx-auto border border-white/5 rounded-[2.5rem] bg-[#080808] overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div>
              <h2 className="text-xl font-black tracking-tight mb-1 uppercase tracking-widest text-sm">Feature Comparison</h2>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Detailed breakdown of enterprise capabilities</p>
            </div>
            <div className="flex gap-12 mr-8">
              {['STANDARD', 'PREMIUM', 'ELITE'].map(p => (
                <span key={p} className="text-[10px] font-black uppercase tracking-widest text-gray-500 w-[100px] text-center">{p}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            {Object.entries(featureKeys).map(([category, features]) => (
              <FeatureCategory
                key={category}
                label={categoryLabels[category]}
                features={features}
                plans={plans || []}
                categoryKey={category}
              />
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <button
            onClick={() => window.open('mailto:engineering@WellZo.com')}
            className="text-primary hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
          >
            Contact Engineering Team
          </button>
        </div>
      </div>

      <SuccessModal
        isOpen={errorConfig.isOpen}
        onClose={() => setErrorConfig({ ...errorConfig, isOpen: false })}
        title={errorConfig.title}
        message={errorConfig.message}
        type="error"
      />
    </div>
  );
};
