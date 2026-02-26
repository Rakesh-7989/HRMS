import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/common/api';
import { Button } from '@/components/ui/Button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Check, Send, Lock, ThumbsUp,
    Users, Calendar, DollarSign, AlertTriangle,
    ChevronDown, ChevronUp, Search, Download,
    FileText, Building2, Shield, BarChart3,
    Wallet, ArrowLeft, Zap, CheckCircle2,
    XCircle, TrendingUp, TrendingDown, Eye,
    Loader2, Receipt, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';

const STAGES = ['REVIEW', 'INITIATE', 'VERIFY', 'RELEASE'];
const STAGE_ICONS: any = { REVIEW: Eye, INITIATE: Zap, VERIFY: Shield, RELEASE: Send };
const STAGE_COLORS: any = {
    REVIEW: 'indigo', INITIATE: 'blue', VERIFY: 'purple', RELEASE: 'emerald'
};

const formatCurrency = (val: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toFixed(0)}`;
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export const RiverProcess = () => {
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

            const res = await api.get(endpoint);
            setData(res.data);

            // Auto-set stage from run status if returned (only on first load)
            if (isFirstLoad.current && res.data?.runStatus?.stage && stage === 'REVIEW') {
                const serverStage = res.data.runStatus.stage;
                if (STAGES.indexOf(serverStage) > STAGES.indexOf(stage)) {
                    setStage(serverStage);
                }
                isFirstLoad.current = false;
            } else if (isFirstLoad.current) {
                isFirstLoad.current = false;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string, payload: any = {}) => {
        try {
            setActionLoading(true);
            if (action === 'INITIATE') {
                await api.post(`/payroll/river/initiate/${runId}`);
                setStage('VERIFY');
                toast.success("Payroll Calculated & Frozen!");
            } else if (action === 'APPROVE') {
                await api.post(`/payroll/river/verify/${runId}/approve`, { status: 'APPROVED', comments: payload.comments || 'Approved' });
                toast.success("Payroll Approved!");
                fetchStageData();
            } else if (action === 'REJECT') {
                await api.post(`/payroll/river/verify/${runId}/approve`, { status: 'REJECTED', comments: payload.comments || 'Rejected' });
                toast.error("Payroll Rejected");
                fetchStageData();
            } else if (action === 'RELEASE') {
                await api.post(`/payroll/river/release/${runId}`);
                toast.success("🎉 Payroll Released to Employees!");
                setStage('RELEASE');
                fetchStageData();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Payroll Process">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading Stage Data...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Payroll Process">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/Payroll')}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll Process</h1>
                        <p className="text-xs text-gray-500">Run: {runId?.substring(0, 8)}...</p>
                    </div>
                </div>

                {/* Premium Stepper */}
                <div className="relative mb-8">
                    <div className="flex justify-between items-center relative z-10">
                        {STAGES.map((s, idx) => {
                            const isActive = s === stage;
                            const isCompleted = STAGES.indexOf(stage) > idx;
                            const Icon = STAGE_ICONS[s];
                            const color = STAGE_COLORS[s];

                            return (
                                <div key={s} className="flex-1 flex flex-col items-center relative cursor-pointer" onClick={() => setStage(s)}>
                                    {idx > 0 && (
                                        <div className={`absolute top-5 right-1/2 w-full h-0.5 -z-10 transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                    )}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive
                                            ? `border-${color}-500 bg-${color}-500/20 text-${color}-400 ring-4 ring-${color}-500/10 scale-110`
                                            : isCompleted
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                            }`}
                                        style={isActive ? { borderColor: `var(--${color})`, boxShadow: `0 0 20px rgba(99, 102, 241, 0.15)` } : {}}
                                    >
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs mt-2 font-semibold tracking-wide ${isActive ? 'text-indigo-500 dark:text-indigo-400' : isCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500'}`}>
                                        {s}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stage Content */}
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

// =============================================================================
// REVIEW STAGE (Enhanced)
// =============================================================================
const ReviewStage = ({ data, onNext }: any) => {
    const { categories, checklist, variance } = data || {};
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="space-y-5">
            {/* Category Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Headcount Changes', value: categories?.headcount?.newJoiners || 0,
                        sub: `${categories?.headcount?.newJoiners || 0} joiners, ${categories?.headcount?.exits || 0} exits`,
                        icon: Users, color: 'blue', section: 'headcount'
                    },
                    {
                        label: 'Attendance / LOP', value: categories?.attendance?.employeesWithLop || 0,
                        sub: `Employees with unpaid leave`,
                        icon: Calendar, color: 'amber', section: 'lop'
                    },
                    {
                        label: 'Salary Revisions', value: categories?.finance?.salaryRevisions || 0,
                        sub: `Revisions effective this month`,
                        icon: DollarSign, color: 'purple', section: 'revisions'
                    },
                    {
                        label: 'TDS / Tax Config', value: categories?.finance?.totalTdsEmployees || 0,
                        sub: `Employees with tax declarations`,
                        icon: Shield, color: 'indigo', section: null
                    }
                ].map((card, idx) => (
                    <div
                        key={idx}
                        className={`bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 shadow-sm transition-all duration-200 ${card.section ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600/60 hover:-translate-y-0.5 hover:shadow-md' : ''}`}
                        onClick={() => card.section && toggleSection(card.section)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                                <p className={`text-2xl font-bold mt-1 ${card.value > 0 ? `text-${card.color}-600 dark:text-${card.color}-400` : 'text-gray-900 dark:text-white'}`}>
                                    {card.value}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
                            </div>
                            <div className={`p-2.5 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-500/10`}>
                                <card.icon className={`w-5 h-5 text-${card.color}-500 dark:text-${card.color}-400`} />
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
                ))}
            </div>

            {/* Expandable Sections */}
            {expandedSection === 'headcount' && categories?.headcount?.newJoinerDetails?.length > 0 && (
                <DetailTable
                    title="New Joiners This Month"
                    icon={<Users className="w-4 h-4 text-blue-400" />}
                    columns={['Employee', 'Emp Code', 'Department', 'Join Date']}
                    rows={categories.headcount.newJoinerDetails.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.department || '-',
                        new Date(e.join_date).toLocaleDateString()
                    ])}
                />
            )}

            {expandedSection === 'lop' && categories?.attendance?.lopDetails?.length > 0 && (
                <DetailTable
                    title="Employees with LOP"
                    icon={<Calendar className="w-4 h-4 text-amber-400" />}
                    columns={['Employee', 'Emp Code', 'Department', 'LOP Days']}
                    rows={categories.attendance.lopDetails.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.department || '-',
                        e.lop_days
                    ])}
                />
            )}

            {expandedSection === 'revisions' && categories?.finance?.revisionDetails?.length > 0 && (
                <DetailTable
                    title="Salary Revisions"
                    icon={<DollarSign className="w-4 h-4 text-purple-400" />}
                    columns={['Employee', 'Emp Code', 'Structure', 'Annual CTC', 'Effective From']}
                    rows={categories.finance.revisionDetails.map((e: any) => [
                        `${e.first_name} ${e.last_name}`, e.emp_code || '-', e.structure_name || '-',
                        formatCurrency(e.annual_ctc), new Date(e.effective_from).toLocaleDateString()
                    ])}
                />
            )}

            {/* Variance Analysis */}
            {variance && (
                <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700/40 flex justify-between items-center">
                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            Variance Analysis
                        </h4>
                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${parseFloat(variance.gross.percent) > 10 ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                            parseFloat(variance.gross.percent) > 5 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' :
                                'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            }`}>
                            {variance.gross.percent > 0 ? '+' : ''}{variance.gross.percent}% vs Last Month
                        </span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-6">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Gross Pay</span>
                            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(variance.gross.current)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">Prev: {formatCurrency(variance.gross.previous)}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Net Pay</span>
                            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(variance.net?.current || 0)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">Prev: {formatCurrency(variance.net?.previous || 0)}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Headcount</span>
                            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">{variance.headcount.current}</div>
                            <div className="flex items-center gap-1 text-xs mt-1">
                                {variance.headcount.diff > 0 ?
                                    <TrendingUp className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> :
                                    variance.headcount.diff < 0 ?
                                        <TrendingDown className="w-3 h-3 text-red-500 dark:text-red-400" /> : null
                                }
                                <span className={variance.headcount.diff > 0 ? 'text-emerald-500 dark:text-emerald-400' : variance.headcount.diff < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}>
                                    {variance.headcount.diff > 0 ? '+' : ''}{variance.headcount.diff} from prev
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Checklist */}
            <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        Pre-Payroll Checklist
                    </h3>
                    <div className="space-y-2">
                        {checklist?.length === 0 ?
                            <p className="text-gray-500 text-sm">No items pending.</p> :
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
                            className="gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 border-0 shadow-lg shadow-indigo-500/20"
                        >
                            Proceed to Initiate <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// INITIATE STAGE (Enhanced)
// =============================================================================
const InitiateStage = ({ data, onInitiate, onBack, loading }: any) => {

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800/60 border-2 border-blue-200 dark:border-blue-500/30 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/5">
                <div className="bg-gradient-to-r from-blue-50 dark:from-blue-500/10 to-indigo-50 dark:to-indigo-500/10 p-6 border-b border-gray-100 dark:border-gray-700/40">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                        Initiate Payroll Calculation
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Step 2 of 4 — Lock inputs and calculate</p>
                </div>
                <div className="p-8 text-center">
                    <Lock className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400 mb-6 animate-pulse" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Lock & Calculate</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">
                        This action will <strong className="text-gray-900 dark:text-white">freeze</strong> all inputs
                        (attendance, salary structures, LOP) and trigger the payroll calculation engine.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400/80 mb-8">
                        ⚠ Any changes after initiation will require a full rollback.
                    </p>

                    {/* Pre-calc Summary */}
                    <div className="grid grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">LOP Emps</div>
                            <div className="text-lg font-bold text-amber-500 dark:text-amber-400">{data?.categories?.attendance?.employeesWithLop || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">New Joiners</div>
                            <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{data?.categories?.headcount?.newJoiners || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Revisions</div>
                            <div className="text-lg font-bold text-purple-500 dark:text-purple-400">{data?.categories?.finance?.salaryRevisions || 0}</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={onBack} className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                            Back to Review
                        </Button>
                        <Button
                            onClick={onInitiate}
                            disabled={loading}
                            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-0 shadow-lg shadow-blue-500/25 min-w-[200px]"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
                            ) : (
                                <><Lock className="w-4 h-4" /> Lock & Initiate</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// VERIFY STAGE (Enhanced with full analytics)
// =============================================================================
const VerifyStage = ({ data, onApprove, onReject, onNext, loading }: any) => {
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
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Employees', value: data?.summary?.count || 0, icon: Users, color: 'blue', isCurrency: false },
                    { label: 'Total Gross', value: data?.summary?.total_gross || 0, icon: Wallet, color: 'indigo', isCurrency: true },
                    { label: 'Deductions', value: data?.summary?.total_deductions || 0, icon: Receipt, color: 'amber', isCurrency: true },
                    { label: 'Tax (TDS)', value: data?.summary?.total_tax || 0, icon: Shield, color: 'rose', isCurrency: true },
                    { label: 'Net Payout', value: data?.summary?.total_net || 0, icon: DollarSign, color: 'emerald', isCurrency: true }
                ].map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={`w-4 h-4 text-${card.color}-500 dark:text-${card.color}-400`} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {card.isCurrency ? formatCurrency(card.value) : card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Component Breakdown Chart + Department Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Component Chart */}
                {componentData.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            Component Breakdown
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

                {/* Department Breakdown */}
                {data?.departmentBreakdown?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl p-5 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                            Department Summary
                        </h4>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto">
                            {data.departmentBreakdown.map((dept: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{dept.department}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{dept.employeeCount} employees</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(dept.net)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Gross: {formatCurrency(dept.gross)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Variance Alerts */}
            {data?.varianceAlerts?.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Variance Alerts ({data.varianceAlerts.length} employees with &gt;10% change)
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400 border-b border-amber-200 dark:border-amber-500/10">
                                    <th className="text-left py-2 px-2">Employee</th>
                                    <th className="text-right py-2 px-2">Previous</th>
                                    <th className="text-right py-2 px-2">Current</th>
                                    <th className="text-right py-2 px-2">Change</th>
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

            {/* Employee Detail Toggle */}
            <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setShowEmployees(!showEmployees)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        Employee-Level Breakdown ({data?.employees?.length || 0})
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
                                    placeholder="Search by name, code, or department..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600/40 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40"
                                />
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                                        <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/50">
                                            <th className="text-left py-2 px-2">Employee</th>
                                            <th className="text-left py-2 px-2">Department</th>
                                            <th className="text-right py-2 px-2">Basic</th>
                                            <th className="text-right py-2 px-2">HRA</th>
                                            <th className="text-right py-2 px-2">Gross</th>
                                            <th className="text-right py-2 px-2">PF</th>
                                            <th className="text-right py-2 px-2">TDS</th>
                                            <th className="text-right py-2 px-2 font-bold">Net</th>
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
                                                <td className="py-2.5 px-2 text-right text-rose-400 font-mono text-xs">{formatCurrency(emp.tds)}</td>
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

            {/* Approval Section */}
            <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Approvals</h4>
                {data?.approvals?.length === 0 ?
                    <p className="text-sm text-gray-500 mb-4">No approvals yet.</p> :
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
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button
                        className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-lg shadow-emerald-500/20"
                        onClick={() => onApprove("Verified and approved")}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                        Approve Payroll
                    </Button>
                </div>

                {data?.runStatus?.verification_status === 'APPROVED' && (
                    <div className="mt-4 flex justify-end animate-fadeIn">
                        <Button
                            onClick={onNext}
                            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 shadow-lg"
                        >
                            Proceed to Release <Send className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

// =============================================================================
// RELEASE STAGE (Enhanced with downloads)
// =============================================================================
const ReleaseStage = ({ data, runId, onRelease, loading }: any) => {
    const [released, setReleased] = useState(data?.run?.status === 'RELEASED');

    const handleDownload = async (type: string) => {
        try {
            const endpoint = type === 'bank' ?
                `/payroll/river/release/${runId}/bank-file` :
                `/payroll/river/release/${runId}/salary-register`;
            const res = await api.get(endpoint);

            // Convert to CSV and download
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
            toast.success(`${type === 'bank' ? 'Bank File' : 'Salary Register'} downloaded!`);
        } catch (err) {
            toast.error("Download failed");
        }
    };

    const handleRelease = async () => {
        await onRelease();
        setReleased(true);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            {released ? (
                // Success State
                <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border-2 border-emerald-100 dark:border-emerald-500/30 rounded-2xl p-10 text-center shadow-lg">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                        <CheckCircle2 className="w-20 h-20 text-emerald-500 dark:text-emerald-400 relative" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payroll Released!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Payslips have been generated and published for all employees.</p>

                    <div className="grid grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Employees</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totals?.employeeCount || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Total Gross</div>
                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(data?.totals?.totalGross || 0)}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Net Payout</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data?.totals?.totalNet || 0)}</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => handleDownload('register')} className="gap-2 border-gray-600">
                            <FileText className="w-4 h-4" /> Salary Register
                        </Button>
                        <Button variant="outline" onClick={() => handleDownload('bank')} className="gap-2 border-gray-600">
                            <Download className="w-4 h-4" /> Bank File
                        </Button>
                    </div>
                </div>
            ) : (
                // Pre-Release Confirmation
                <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border-2 border-emerald-100 dark:border-emerald-500/30 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/5">
                    <div className="bg-gradient-to-r from-emerald-50 dark:from-emerald-500/10 to-green-50 dark:to-green-500/10 p-6 border-b border-gray-100 dark:border-gray-700/40">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Send className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                            Release Payroll
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">Final step — Publish payslips and generate reports</p>
                    </div>

                    {/* Summary */}
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Employees</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{data?.totals?.employeeCount || 0}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Total Gross</div>
                                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(data?.totals?.totalGross || 0)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Deductions</div>
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(data?.totals?.totalDeductions || 0)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Net Payout</div>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data?.totals?.totalNet || 0)}</div>
                            </div>
                        </div>

                        {/* Department Breakdown */}
                        {data?.departmentBreakdown?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Department Breakdown</h4>
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

                        {/* Audit Trail */}
                        {data?.auditTrail?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Audit Trail</h4>
                                <div className="space-y-2">
                                    {data.auditTrail.map((entry: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 text-xs text-gray-400">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                            <span className="text-gray-300 font-medium">{entry.action}</span>
                                            <span>by {entry.performedBy}</span>
                                            <span className="ml-auto">{new Date(entry.timestamp).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Downloads & Release */}
                        <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full">
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => handleDownload('register')} className="flex-1 gap-2 border-gray-600">
                                    <FileText className="w-4 h-4" /> Download Salary Register
                                </Button>
                                <Button variant="outline" onClick={() => handleDownload('bank')} className="flex-1 gap-2 border-gray-600">
                                    <Download className="w-4 h-4" /> Download Bank File
                                </Button>
                            </div>
                            <Button
                                size="lg"
                                onClick={handleRelease}
                                disabled={loading}
                                className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-lg shadow-emerald-500/25 text-lg py-3"
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Releasing...</>
                                ) : (
                                    <><Send className="w-5 h-5" /> Release & Publish Payslips</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================
const DetailTable = ({ title, icon, columns, rows }: any) => (
    <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/40 rounded-xl overflow-hidden animate-fadeIn shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/40 flex items-center gap-2">
            {icon}
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
            <span className="text-xs text-gray-500 ml-auto">{rows.length} records</span>
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

// CSV helpers
const convertBankFileToCSV = (entries: any[]) => {
    const headers = ['S.No', 'Employee Name', 'Emp Code', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount'];
    const rows = entries.map(e => [e.sno, e.employeeName, e.empCode, e.bankName, e.accountNumber, e.ifscCode, e.amount]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

const convertRegisterToCSV = (entries: any[]) => {
    const headers = ['Employee', 'Emp Code', 'Department', 'Basic', 'HRA', 'Other', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Net'];
    const rows = entries.map(e => [
        `${e.first_name} ${e.last_name}`, e.emp_code, e.department || '-',
        e.basic_pay, e.hra, e.other_allowances, e.gross_pay,
        e.pf_employee, e.esi_employee, e.professional_tax, e.tds_amount, e.net_pay
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export default RiverProcess;
