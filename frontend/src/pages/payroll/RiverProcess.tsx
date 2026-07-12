import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Check, Send, Lock, ThumbsUp,
    Users, Calendar, IndianRupee, AlertTriangle,
    ChevronDown, ChevronUp, Search, Download,
    FileText, Building2, Shield, BarChart3,
    Wallet, ArrowLeft, Zap, CheckCircle2,
    XCircle, TrendingUp, TrendingDown, Eye,
    Loader2, Receipt, Clock
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';

const STAGES = ['REVIEW', 'INITIATE', 'VERIFY', 'RELEASE'];
const STAGE_ICONS: any = { REVIEW: Eye, INITIATE: Zap, VERIFY: Shield, RELEASE: Send };
const STAGE_COLORS: any = {
    REVIEW: 'indigo', INITIATE: 'blue', VERIFY: 'purple', RELEASE: 'emerald'
};

const formatCurrency = (val: number) => {
    if (val === 0) return '₹0';
    if (!val) return '₹0';
    const sign = val < 0 ? '-' : '';
    const absVal = Math.abs(val);

    if (absVal >= 10000000) return `${sign}₹${(absVal / 10000000).toFixed(2)}Cr`;
    if (absVal >= 100000) return `${sign}₹${(absVal / 100000).toFixed(2)}L`;
    if (absVal >= 1000) return `${sign}₹${(absVal / 1000).toFixed(1)}K`;

    return `${sign}₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const COLOR_CLASSES: any = {
    indigo: {
        active: 'border-brand-500 bg-brand-500/20 text-brand-400 ring-indigo-500/10',
        text: 'text-brand-500 dark:text-brand-400',
        bg: 'bg-brand-50 dark:bg-brand-500/10',
        icon: 'text-brand-500 dark:text-brand-400'
    },
    blue: {
        active: 'border-blue-500 bg-blue-500/20 text-blue-400 ring-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        icon: 'text-blue-500 dark:text-blue-400'
    },
    purple: {
        active: 'border-brand-500 bg-brand-500/20 text-brand-400 ring-purple-500/10',
        text: 'text-brand-600 dark:text-brand-400',
        bg: 'bg-brand-50 dark:bg-brand-500/10',
        icon: 'text-brand-500 dark:text-brand-400'
    },
    emerald: {
        active: 'border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-emerald-500/10',
        text: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        icon: 'text-emerald-500 dark:text-emerald-400'
    },
    amber: {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        icon: 'text-amber-500 dark:text-amber-400'
    },
    rose: {
        text: 'text-error-600 dark:text-error-400',
        bg: 'bg-error-50 dark:bg-error-500/10',
        icon: 'text-error-500 dark:text-error-400'
    },
    indigo_light: {
        text: 'text-brand-600 dark:text-brand-400',
        bg: 'bg-brand-50 dark:bg-brand-500/10',
        icon: 'text-brand-500 dark:text-brand-400'
    }
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export const RiverProcess = () => {
    const { t } = useTranslation();
    const { runId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [stage, setStage] = useState('REVIEW');
    const [data, setData] = useState<any>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => { fetchStageData(); }, [runId, stage]);

    const fetchStageData = async () => {
        try {
            setLoading(true);
            let endpoint = `/payroll/river/review/${runId}`;
            if (stage === 'VERIFY') endpoint = `/payroll/river/verify/${runId}`;
            if (stage === 'RELEASE') endpoint = `/payroll/river/release/${runId}/summary`;
            if (stage === 'INITIATE') endpoint = `/payroll/river/review/${runId}`;

            const res = await api.get(`${endpoint}?_t=${Date.now()}`);
            setData(res.data);

            if (isFirstLoad.current && res.data?.runStatus?.stage && stage === 'REVIEW') {
                const serverStage = res.data.runStatus.stage;
                if (STAGES.indexOf(serverStage) > STAGES.indexOf(stage)) {
                    setStage(serverStage);
                }
                isFirstLoad.current = false;
            } else if (isFirstLoad.current) {
                isFirstLoad.current = false;
            }
        } catch (error: any) {
            console.error(error);
            showToast.error(error.response?.data?.error || t('riverProcess.fetchFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string, payload: any = {}) => {
        if (actionLoading) return;
        try {
            setActionLoading(true);
            if (action === 'INITIATE') {
                await api.post(`/payroll/river/initiate/${runId}`);
                setStage('VERIFY');
                showToast.success(t('riverProcess.calculatedFrozen'));
            } else if (action === 'APPROVE') {
                await api.post(`/payroll/river/verify/${runId}/approve`, { status: 'APPROVED', comments: payload.comments || 'Approved' });
                showToast.success(t('riverProcess.approved'));
                fetchStageData();
            } else if (action === 'REJECT') {
                await api.post(`/payroll/river/verify/${runId}/approve`, { status: 'REJECTED', comments: payload.comments || 'Rejected' });
                showToast.error(t('riverProcess.rejected'));
                fetchStageData();
            } else if (action === 'RELEASE') {
                await api.post(`/payroll/river/release/${runId}`);
                showToast.success(t('riverProcess.released'));
                setStage('RELEASE');
                fetchStageData();
            }
        } catch (err: any) {
            showToast.error(err.response?.data?.error || t('riverProcess.actionFailed'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title={t('payroll.payrollManagement') || t('riverProcess.title')}>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto" />
                        <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t('riverProcess.loading')}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={t('payroll.payrollManagement') || t('riverProcess.title')}>
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/payroll')}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('riverProcess.title')}</h1>
                        <p className="text-xs text-gray-500">{t('riverProcess.runId', { id: runId?.substring(0, 8) })}...</p>
                    </div>
                </div>

                <div className="relative mb-8">
                    <div className="flex justify-between items-center relative z-10">
                        {STAGES.map((s, idx) => {
                            const isActive = s === stage;
                            const isCompleted = STAGES.indexOf(stage) > idx;
                            const Icon = STAGE_ICONS[s];
                            const color = STAGE_COLORS[s];
                            const styles = COLOR_CLASSES[color] || COLOR_CLASSES.indigo;

                            return (
                                <div key={s} className="flex-1 flex flex-col items-center relative cursor-pointer" onClick={() => setStage(s)}>
                                    {idx > 0 && (
                                        <div className={`absolute top-5 right-1/2 w-full h-0.5 -z-10 transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                    )}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive
                                            ? `${styles.active} scale-110 shadow-[0_0_20px_rgba(99,102,241,0.2)]`
                                            : isCompleted
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                            }`}
                                    >
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs mt-2 font-semibold tracking-wide ${isActive ? 'text-brand-500 dark:text-brand-400' : isCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500'}`}>
                                        {s}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 animate-fadeIn">
                    {stage === 'REVIEW' && <ReviewStage data={data} onNext={() => setStage('INITIATE')} />}
                    {stage === 'INITIATE' && <InitiateStage data={data} onInitiate={() => handleAction('INITIATE')} onBack={() => setStage('REVIEW')} loading={actionLoading} />}
                    {stage === 'VERIFY' && <VerifyStage data={data} onApprove={(c: string) => handleAction('APPROVE', { comments: c })} onReject={(c: string) => handleAction('REJECT', { comments: c })} onNext={() => setStage('RELEASE')} loading={actionLoading} />}
                    {stage === 'RELEASE' && <ReleaseStage data={data} runId={runId} onRelease={() => handleAction('RELEASE')} loading={actionLoading} />}
                </div>
            </div>
        </DashboardLayout>
    );
};

const ReviewStage = ({ data, onNext }: any) => {
    const { t } = useTranslation();
    const { categories, checklist, variance } = data || {};
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: t('riverProcess.headcountChanges'), value: categories?.headcount?.newJoiners || 0,
                        sub: t('riverProcess.joinersExits', { joiners: categories?.headcount?.newJoiners || 0, exits: categories?.headcount?.exits || 0 }),
                        icon: Users, color: 'blue', section: 'headcount'
                    },
                    {
                        label: t('riverProcess.attendanceLop'), value: categories?.attendance?.employeesWithLop || 0,
                        sub: t('riverProcess.employeesWithLop'),
                        icon: Calendar, color: 'amber', section: 'lop'
                    },
                    {
                        label: t('riverProcess.salaryRevisions'), value: categories?.finance?.salaryRevisions || 0,
                        sub: t('riverProcess.revisionsEffective'),
                        icon: IndianRupee, color: 'purple', section: 'revisions'
                    },
                    {
                        label: t('riverProcess.arrearsManagement'), value: categories?.arrears?.count || 0,
                        sub: t('riverProcess.arrearsPending', { amount: formatCurrency(categories?.arrears?.totalAmount || 0) }),
                        icon: IndianRupee, color: 'rose', section: 'arrears'
                    },
                    {
                        label: t('riverProcess.tdsTaxConfig'), value: categories?.finance?.totalTdsEmployees || 0,
                        sub: t('riverProcess.taxDeclarations'),
                        icon: Shield, color: 'indigo', section: null
                    }
                ].map((card, idx) => {
                    const cardStyles: any = {
                        blue: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', icon: 'text-blue-500 dark:text-blue-400' },
                        amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-500 dark:text-amber-400' },
                        purple: { text: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', icon: 'text-brand-500 dark:text-brand-400' },
                        rose: { text: 'text-error-600 dark:text-error-400', bg: 'bg-error-50 dark:bg-error-500/10', icon: 'text-error-500 dark:text-error-400' },
                        indigo: { text: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', icon: 'text-brand-500 dark:text-brand-400' },
                    };
                    const style = cardStyles[card.color] || cardStyles.indigo;

                    return (
                        <div
                            key={idx}
                            className={`bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 shadow-elev-1 transition-all duration-200 ${card.section ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600/60 hover:-translate-y-0.5 hover:shadow-elev-3' : ''}`}
                            onClick={() => card.section && toggleSection(card.section)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                                    <p className={`text-2xl font-bold mt-1 ${card.value > 0 ? style.text : 'text-gray-900 dark:text-white'}`}>
                                        {card.value}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
                                </div>
                                <div className={`p-2.5 rounded-xl ${style.bg}`}>
                                    <card.icon className={`w-5 h-5 ${style.icon}`} />
                                </div>
                            </div>
                            {card.section && (
                                <div className="mt-2 text-center">
                                    {expandedSection === card.section ?
                                        <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-auto" /> :
                                        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-auto" />
                                    }
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {expandedSection === 'headcount' && categories?.headcount?.newJoinerDetails?.length > 0 && (
                <DetailTable
                    title={t('riverProcess.newJoiners')}
                    icon={<Users className="w-4 h-4 text-blue-400" />}
                    columns={[t('riverProcess.employee'), 'Emp Code', t('departments.title'), t('calendar.startDate')]}
                    rows={categories.headcount.newJoinerDetails.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.department || '-',
                        new Date(e.join_date).toLocaleDateString()
                    ])}
                />
            )}

            {expandedSection === 'lop' && categories?.attendance?.lopDetails?.length > 0 && (
                <DetailTable
                    title={t('riverProcess.employeesLop')}
                    icon={<Calendar className="w-4 h-4 text-amber-400" />}
                    columns={[t('riverProcess.employee'), 'Emp Code', t('departments.title'), t('riverProcess.lopDays')]}
                    rows={categories.attendance.lopDetails.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.department || '-',
                        e.lop_days
                    ])}
                />
            )}

            {expandedSection === 'revisions' && categories?.finance?.revisionDetails?.length > 0 && (
                <DetailTable
                    title={t('riverProcess.salaryRevisionsTitle')}
                    icon={<IndianRupee className="w-4 h-4 text-brand-400" />}
                    columns={[t('riverProcess.employee'), 'Emp Code', t('riverProcess.structure'), t('riverProcess.annualCtc'), t('riverProcess.effectiveFrom')]}
                    rows={categories.finance.revisionDetails.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.structure_name || '-',
                        formatCurrency(e.annual_ctc), new Date(e.effective_from).toLocaleDateString()
                    ])}
                />
            )}

            {expandedSection === 'arrears' && categories?.arrears?.details?.length > 0 && (
                <DetailTable
                    title={t('riverProcess.pendingArrears')}
                    icon={<Receipt className="w-4 h-4 text-error-400" />}
                    columns={[t('riverProcess.employee'), 'Emp Code', t('departments.title'), t('riverProcess.amount'), t('riverProcess.reason')]}
                    rows={categories.arrears.details.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.department || '-',
                        formatCurrency(e.amount), e.reason || '-'
                    ])}
                />
            )}

            {variance && (
                <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-elev-1">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700/40 flex justify-between items-center">
                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-brand-500 dark:text-brand-400" />
                            {t('riverProcess.varianceAnalysis')}
                        </h4>
                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${parseFloat(variance.gross.percent) > 10 ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                            parseFloat(variance.gross.percent) > 5 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' :
                                'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            }`}>
                            {t('riverProcess.vsLastMonth', { percent: variance.gross.percent > 0 ? `+${variance.gross.percent}` : variance.gross.percent })}
                        </span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-6">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.grossPay')}</span>
                            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(variance.gross.current)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{t('riverProcess.prev', { amount: formatCurrency(variance.gross.previous) })}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.netPay')}</span>
                            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(variance.net?.current || 0)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{t('riverProcess.prev', { amount: formatCurrency(variance.net?.previous || 0) })}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.headcount')}</span>
                            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{variance.headcount.current}</div>
                            <div className="flex items-center gap-1 text-xs mt-1">
                                {variance.headcount.diff > 0 ?
                                    <TrendingUp className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> :
                                    variance.headcount.diff < 0 ?
                                        <TrendingDown className="w-3 h-3 text-red-500 dark:text-red-400" /> : null
                                }
                                <span className={variance.headcount.diff > 0 ? 'text-emerald-500 dark:text-emerald-400' : variance.headcount.diff < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}>
                                    {t('riverProcess.diffFromPrev', { diff: variance.headcount.diff > 0 ? `+${variance.headcount.diff}` : variance.headcount.diff })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-elev-1">
                <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                        {t('riverProcess.prePayrollChecklist')}
                    </h3>
                    <div className="space-y-2">
                        {checklist?.length === 0 ?
                            <p className="text-gray-500 text-sm">{t('riverProcess.noItemsPending')}</p> :
                            checklist?.map((item: any) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.status === 'COMPLETED'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                                        : item.status === 'WARNING'
                                            ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20'
                                            : 'bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-700/40'
                                        }`}
                                >
                                    {item.status === 'COMPLETED' ?
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" /> :
                                        item.status === 'WARNING' ?
                                            <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" /> :
                                            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    }
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{item.item_name}</p>
                                        <p className="text-xs text-gray-500">{item.comment}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                        item.status === 'WARNING' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                            'bg-gray-100 dark:bg-gray-600/30 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {item.status.toLowerCase()}
                                    </span>
                                </div>
                            ))
                        }
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={onNext}
                            className="gap-2 bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-600 hover:to-blue-700 border-0 shadow-elev-4 shadow-brand-500/20"
                        >
                            {t('riverProcess.proceedToInitiate')} <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InitiateStage = ({ data, onInitiate, onBack, loading }: any) => {
    const { t } = useTranslation();

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800/60 border-2 border-blue-200 dark:border-blue-500/30 rounded-2xl overflow-hidden shadow-elev-5 shadow-blue-500/5">
                <div className="bg-gradient-to-r from-blue-50 dark:from-blue-500/10 to-brand-50 dark:to-brand-500/10 p-6 border-b border-gray-100 dark:border-gray-700/40">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                        {t('riverProcess.initiatePayroll')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('riverProcess.step2Of4')}</p>
                </div>
                <div className="p-8 text-center">
                    <Lock className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400 mb-6 animate-pulse" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('riverProcess.lockAndCalculate')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">
                        {t('riverProcess.lockDesc')}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400/80 mb-8">
                        {t('riverProcess.rollbackWarning')}
                    </p>

                    <div className="grid grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.lopEmps')}</div>
                            <div className="text-lg font-bold text-amber-500 dark:text-amber-400">{data?.categories?.attendance?.employeesWithLop || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.newJoinersLabel')}</div>
                            <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{data?.categories?.headcount?.newJoiners || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.revisionsLabel')}</div>
                            <div className="text-lg font-bold text-brand-500 dark:text-brand-400">{data?.categories?.finance?.salaryRevisions || 0}</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={onBack} className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                            {t('riverProcess.backToReview')}
                        </Button>
                        <Button
                            onClick={onInitiate}
                            disabled={loading}
                            className="gap-2 bg-gradient-to-r from-blue-500 to-brand-600 hover:from-blue-600 hover:to-brand-700 border-0 shadow-elev-4 shadow-blue-500/25 min-w-[200px]"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {t('riverProcess.calculating')}</>
                            ) : (
                                <><Lock className="w-4 h-4" /> {t('riverProcess.lockAndInitiate')}</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerifyStage = ({ data, onApprove, onReject, onNext, loading }: any) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmployees, setShowEmployees] = useState(false);

    const filteredEmployees = data?.employees?.filter((e: any) =>
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.empCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const componentData = data?.componentBreakdown ? [
        { name: 'Basic', value: data.componentBreakdown.basic },
        { name: 'HRA', value: data.componentBreakdown.hra },
        { name: 'Other Allow.', value: data.componentBreakdown.otherAllowances },
        { name: 'PF (Emp)', value: data.componentBreakdown.pfEmployee },
        { name: 'ESI (Emp)', value: data.componentBreakdown.esiEmployee },
        { name: 'PT', value: data.componentBreakdown.professionalTax },
        { name: 'TDS', value: data.componentBreakdown.tds }
    ].filter(c => c.value > 0) : [];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: t('common.breadcrumbs.employees'), value: data?.summary?.count || 0, icon: Users, color: 'blue', isCurrency: false },
                    { label: t('riverProcess.totalGross'), value: data?.summary?.total_gross || 0, icon: Wallet, color: 'indigo', isCurrency: true },
                    { label: t('riverProcess.deductions'), value: data?.summary?.total_deductions || 0, icon: IndianRupee, color: 'amber', isCurrency: true },
                    { label: t('riverProcess.taxTds'), value: data?.summary?.total_tax || 0, icon: Shield, color: 'rose', isCurrency: true },
                    { label: t('riverProcess.netPayout'), value: data?.summary?.total_net || 0, icon: IndianRupee, color: 'emerald', isCurrency: true }
                ].map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 shadow-elev-1">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={`w-4 h-4 ${COLOR_CLASSES[card.color]?.icon || 'text-brand-500'}`} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {card.isCurrency ? formatCurrency(card.value) : card.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {componentData.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5 shadow-elev-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-brand-500 dark:text-brand-400" />
                            {t('riverProcess.componentBreakdown')}
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={componentData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#6b7280" fontSize={11} tickFormatter={(v) => formatCurrency(v)} />
                                <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={80} />
                                <Tooltip
                                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value: number) => [formatCurrency(value)]}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {componentData.map((_, idx) => (
                                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {data?.departmentBreakdown?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5 shadow-elev-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-500 dark:text-brand-400" />
                            {t('riverProcess.departmentSummary')}
                        </h4>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto">
                            {data.departmentBreakdown.map((dept: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{dept.department}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{dept.employeeCount} {t('riverProcess.employeesLabel')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(dept.net)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{t('riverProcess.grossPay')}: {formatCurrency(dept.gross)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {data?.varianceAlerts?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('riverProcess.varianceAlerts', { count: data.varianceAlerts.length })}
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400 border-b border-amber-200 dark:border-amber-500/10">
                                    <th className="text-left py-2 px-2">{t('riverProcess.employee')}</th>
                                    <th className="text-right py-2 px-2">{t('riverProcess.previous')}</th>
                                    <th className="text-right py-2 px-2">{t('riverProcess.current')}</th>
                                    <th className="text-right py-2 px-2">{t('riverProcess.change')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.varianceAlerts.map((emp: any, idx: number) => (
                                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700/30">
                                        <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{emp.name} ({emp.empCode})</td>
                                        <td className="py-2 px-2 text-right text-gray-500 dark:text-gray-400">{formatCurrency(emp.previousGross)}</td>
                                        <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{formatCurrency(emp.currentGross)}</td>
                                        <td className="py-2 px-2 text-right">
                                            <span className={`text-xs font-bold ${emp.changePercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {emp.changePercent > 0 ? '+' : ''}{emp.changePercent}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-elev-1">
                <button
                    onClick={() => setShowEmployees(!showEmployees)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-500 dark:text-brand-400" />
                        {t('riverProcess.employeeBreakdown', { count: data?.employees?.length || 0 })}
                    </span>
                    {showEmployees ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {showEmployees && (
                    <div className="border-t border-gray-200 dark:border-gray-700/40">
                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <input
                                    type="text"
                                    placeholder={t('riverProcess.searchEmployee')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600/40 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-brand-500/40"
                                />
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                                        <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/50">
                                            <th className="text-left py-2 px-2">{t('riverProcess.employee')}</th>
                                            <th className="text-left py-2 px-2">{t('departments.title')}</th>
                                            <th className="text-right py-2 px-2">{t('riverProcess.basic')}</th>
                                            <th className="text-right py-2 px-2">{t('riverProcess.hra')}</th>
                                            <th className="text-right py-2 px-2">{t('riverProcess.grossPay')}</th>
                                            <th className="text-right py-2 px-2">{t('riverProcess.pf')}</th>
                                            <th className="text-right py-2 px-2">{t('riverProcess.tds')}</th>
                                            <th className="text-right py-2 px-2 font-bold">{t('riverProcess.netPay')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEmployees.map((emp: any, idx: number) => (
                                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/20 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                                <td className="py-2.5 px-2">
                                                    <div className="text-gray-800 dark:text-gray-200 font-medium">{emp.name}</div>
                                                    <div className="text-xs text-gray-500">{emp.empCode}</div>
                                                </td>
                                                <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 text-xs">{emp.department || '-'}</td>
                                                <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300 font-mono text-xs">{formatCurrency(emp.basicPay)}</td>
                                                <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300 font-mono text-xs">{formatCurrency(emp.hra)}</td>
                                                <td className="py-2.5 px-2 text-right text-gray-900 dark:text-white font-mono text-xs">{formatCurrency(emp.grossPay)}</td>
                                                <td className="py-2.5 px-2 text-right text-amber-400 font-mono text-xs">{formatCurrency(emp.pfEmployee)}</td>
                                                <td className="py-2.5 px-2 text-right text-error-400 font-mono text-xs">{formatCurrency(emp.tds)}</td>
                                                <td className="py-2.5 px-2 text-right text-emerald-400 font-mono text-xs font-bold">{formatCurrency(emp.netPay)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl p-5 shadow-elev-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('riverProcess.approvals')}</h4>
                {data?.approvals?.length === 0 ?
                    <p className="text-sm text-gray-500 mb-4">{t('riverProcess.noApprovals')}</p> :
                    <div className="space-y-2 mb-4">
                        {data?.approvals?.map((a: any) => (
                            <div key={a.id} className={`text-sm p-3 rounded-lg flex items-center gap-2 ${a.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                {a.status === 'APPROVED' ?
                                    <CheckCircle2 className="w-4 h-4" /> :
                                    <XCircle className="w-4 h-4" />
                                }
                                {a.status} by {a.first_name} {a.last_name} on {new Date(a.approved_at).toLocaleString()}
                            </div>
                        ))}
                    </div>
                }

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => onReject("Needs corrections")}
                        disabled={loading}
                    >
                        <XCircle className="w-4 h-4 mr-2" /> {t('riverProcess.reject')}
                    </Button>
                    <Button
                        className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-elev-4 shadow-emerald-500/20"
                        onClick={() => onApprove("Verified and approved")}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                        {t('riverProcess.approvePayroll')}
                    </Button>
                </div>

                {data?.runStatus?.verification_status === 'APPROVED' && (
                    <div className="mt-4 flex justify-end animate-fadeIn">
                        <Button
                            onClick={onNext}
                            className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-purple-700 border-0 shadow-elev-4"
                        >
                            {t('riverProcess.proceedToRelease')} <Send className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ReleaseStage = ({ data, runId, onRelease, loading }: any) => {
    const { t } = useTranslation();
    const [released, setReleased] = useState(data?.run?.status === 'RELEASED');

    useEffect(() => {
        if (data?.run?.status === 'RELEASED') {
            setReleased(true);
        }
    }, [data?.run?.status]);

    const handleDownload = async (type: string) => {
        try {
            const endpoint = type === 'bank' ?
                `/payroll/river/release/${runId}/bank-file` :
                `/payroll/river/release/${runId}/salary-register`;
            const res = await api.get(endpoint);

            const csvData = type === 'bank' ?
                convertBankFileToCSV(res.data?.bankEntries || []) :
                convertRegisterToCSV(res.data || []);

            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type === 'bank' ? 'bank_file' : 'salary_register'}_${runId?.substring(0, 8)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast.success(type === 'bank' ? t('riverProcess.bankFileDownloaded') : t('riverProcess.registerDownloaded'));
        } catch (err) {
            showToast.error(t('riverProcess.downloadFailed'));
        }
    };

    const handleRelease = async () => {
        try {
            await onRelease();
            setReleased(true);
        } catch (error) {
            console.error("Release failed", error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            {released ? (
                <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border-2 border-emerald-100 dark:border-emerald-500/30 rounded-2xl p-10 text-center shadow-elev-4">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                        <CheckCircle2 className="w-20 h-20 text-emerald-500 dark:text-emerald-400 relative" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('riverProcess.payrollReleased')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">{t('riverProcess.payslipsGenerated')}</p>

                    <div className="grid grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('common.breadcrumbs.employees')}</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totals?.employeeCount || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.totalGross')}</div>
                            <div className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatCurrency(data?.totals?.totalGross || 0)}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.netPayout')}</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data?.totals?.totalNet || 0)}</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => handleDownload('register')} className="gap-2 border-gray-600">
                            <FileText className="w-4 h-4" /> {t('riverProcess.salaryRegister')}
                        </Button>
                        <Button variant="outline" onClick={() => handleDownload('bank')} className="gap-2 border-gray-600">
                            <Download className="w-4 h-4" /> {t('riverProcess.bankFile')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border-2 border-emerald-100 dark:border-emerald-500/30 rounded-2xl overflow-hidden shadow-elev-5 shadow-emerald-500/5">
                    <div className="bg-gradient-to-r from-emerald-50 dark:from-emerald-500/10 to-green-50 dark:to-green-500/10 p-6 border-b border-gray-100 dark:border-gray-700/40">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Send className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                            {t('riverProcess.releasePayroll')}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">{t('riverProcess.finalStep')}</p>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('common.breadcrumbs.employees')}</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{data?.totals?.employeeCount || 0}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.totalGross')}</div>
                                <div className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatCurrency(data?.totals?.totalGross || 0)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.deductions')}</div>
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(data?.totals?.totalDeductions || 0)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('riverProcess.netPayout')}</div>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data?.totals?.totalNet || 0)}</div>
                            </div>
                        </div>

                        {data?.departmentBreakdown?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('riverProcess.departmentBreakdown')}</h4>
                                <div className="space-y-2">
                                    {data.departmentBreakdown.map((dept: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-700/20 rounded-lg">
                                            <span className="text-sm text-gray-300">{dept.department} ({dept.count})</span>
                                            <span className="text-sm font-mono text-emerald-400">{formatCurrency(dept.netPay)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {data?.auditTrail?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('riverProcess.auditTrail')}</h4>
                                <div className="space-y-2">
                                    {data.auditTrail.map((entry: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 text-xs text-gray-400">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                            <span className="text-gray-300 font-medium">{entry.action}</span>
                                            <span>{t('common.by')} {entry.performedBy}</span>
                                            <span className="ml-auto">{new Date(entry.timestamp).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => handleDownload('register')} className="flex-1 gap-2 border-gray-600">
                                    <FileText className="w-4 h-4" /> {t('riverProcess.downloadSalaryRegister')}
                                </Button>
                                <Button variant="outline" onClick={() => handleDownload('bank')} className="flex-1 gap-2 border-gray-600">
                                    <Download className="w-4 h-4" /> {t('riverProcess.downloadBankFile')}
                                </Button>
                            </div>
                            <Button
                                size="lg"
                                onClick={handleRelease}
                                disabled={loading}
                                className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-elev-4 shadow-emerald-500/25 text-lg py-3"
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> {t('riverProcess.releasing')}</>
                                ) : (
                                    <><Send className="w-5 h-5" /> {t('riverProcess.releasePublish')}</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailTable = ({ title, icon, columns, rows }: any) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden animate-fadeIn shadow-elev-1">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700/40 flex items-center gap-2">
                {icon}
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
                <span className="text-xs text-gray-500 ml-auto">{rows.length} {t('riverProcess.records')}</span>
            </div>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/80">
                        <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/40">
                            {columns.map((col: string, idx: number) => (
                                <th key={idx} className="text-left py-2 px-3 font-medium text-xs">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row: any[], idx: number) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/20 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                {row.map((cell: any, cIdx: number) => (
                                    <td key={cIdx} className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const convertBankFileToCSV = (entries: any[]) => {
    const headers = ['S.No', 'Employee Name', 'Emp Code', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount'];
    const rows = entries.map(e => [
        e.sno,
        `"${(e.employeeName || '').replace(/"/g, '""')}"`,
        e.empCode,
        `"${(e.bankName || '').replace(/"/g, '""')}"`,
        `="${e.accountNumber}"`,
        e.ifscCode,
        e.amount
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

const convertRegisterToCSV = (entries: any[]) => {
    const headers = ['Employee', 'Emp Code', 'Department', 'Basic', 'HRA', 'Other', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Net'];

    const escape = (val: any) => {
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = entries.map(e => [
        escape(`${e.first_name} ${e.last_name}`),
        escape(e.emp_code),
        escape(e.department || '-'),
        e.basic_pay,
        e.hra,
        e.other_allowances,
        e.gross_pay,
        e.pf_employee,
        e.esi_employee,
        e.professional_tax,
        e.tds_amount,
        e.net_pay
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export default RiverProcess;
