import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Printer } from 'lucide-react';
import payrollService from '@/services/payroll.service';
import { useAuth } from '@/contexts/AuthContext';
import { resolveImageUrl } from '@/utils/image';
import { useTranslation } from 'react-i18next';

const FnFSettlementDetailsPage: React.FC = () => {
  const { t } = useTranslation();

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: settlement, isLoading, error } = useQuery({
        queryKey: ['payroll', 'fnf', id],
        queryFn: () => payrollService.getFnFSettlementById(id!),
        enabled: !!id
    });

    if (isLoading) return <DashboardLayout title="Loading..."><div className="p-8">Loading settlement details...</div></DashboardLayout>;
    if (error || !settlement) return <DashboardLayout title="Error"><div className="p-8 text-red-500">Failed to load settlement.</div></DashboardLayout>;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID': return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            case 'APPROVED': return <Badge className="bg-brand-100 text-brand-700">Approved</Badge>;
            case 'REJECTED': return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
            case 'PENDING_APPROVAL': return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
            case 'HOLD_ASSET_PENDING': return <Badge className="bg-orange-100 text-orange-800">Asset Hold</Badge>;
            default: return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
        }
    };

    const handlePrint = () => {
        // Programmatically hide ALL fixed-position elements before printing
        const allElements = document.querySelectorAll('*');
        const hiddenElements: { el: HTMLElement; prev: string }[] = [];

        allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computed = window.getComputedStyle(htmlEl);
            if (computed.position === 'fixed') {
                hiddenElements.push({ el: htmlEl, prev: htmlEl.style.display });
                htmlEl.style.display = 'none';
            }
        });

        window.print();

        // Restore all hidden elements after printing
        hiddenElements.forEach(({ el, prev }) => {
            el.style.display = prev;
        });
    };

    return (
        <DashboardLayout
            title="Settlement Details"
            breadcrumbs={[
                { label: t('common.breadcrumbs.payroll'), href: '/payroll' },
                { label: 'F&F', href: '/payroll/fnf' },
                { label: 'Details' }
            ]}
            actions={
                <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/payroll/fnf')}>
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePrint}>
                        <Printer size={16} className="mr-2" /> Print
                    </Button>
                </div>
            }
        >
            <div className="max-w-4xl mx-auto space-y-6 print:w-full print:max-w-none">
                <Card>
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-center print:hidden">
                            <h2 className="text-xl font-bold">Full & Final Settlement Statement</h2>
                            {getStatusBadge(settlement.status)}
                        </div>

                        {/* Print Header */}
                        <div className="hidden print:block text-center mb-8">
                            <div className="mb-6 flex flex-col items-center">
                                {user?.tenant_settings?.logo_url && (
                                    <img
                                        src={resolveImageUrl(user.tenant_settings.logo_url)}
                                        alt="Company Logo"
                                        className="h-16 object-contain mb-2"
                                    />
                                )}
                                <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">
                                    {user?.tenant_settings?.company_name || 'Company Name'}
                                </h1>
                                {user?.tenant_settings?.address && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {user.tenant_settings.address}
                                        {user.tenant_settings.city ? `, ${user.tenant_settings.city}` : ''}
                                        {user.tenant_settings.state ? `, ${user.tenant_settings.state}` : ''}
                                        {user.tenant_settings.zip_code ? ` - ${user.tenant_settings.zip_code}` : ''}
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl font-bold">Full & Final Settlement</h2>
                            <div className="text-sm text-gray-500">Ref: {settlement.id}</div>
                        </div>

                        {/* Employee Details */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg print:bg-transparent print:p-0 border border-gray-100 print:border-none">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Employee Name</h3>
                                <div className="text-lg font-semibold">{settlement.first_name || 'N/A'} {settlement.last_name || ''}</div>
                                <div className="text-sm text-gray-400">{settlement.emp_code}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-sm font-medium text-gray-500">Dates</h3>
                                <div className="text-sm">Resignation: {settlement.resignation_date ? new Date(settlement.resignation_date).toLocaleDateString() : '-'}</div>
                                <div className="text-sm">Last Working Day: {new Date(settlement.last_working_day).toLocaleDateString()}</div>
                                {settlement.paid_at && <div className="text-sm text-green-600 font-medium">Paid On: {new Date(settlement.paid_at).toLocaleDateString()}</div>}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 my-4"></div>

                        {/* Financials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Earnings */}
                            <div>
                                <h3 className="text-md font-semibold mb-3 text-green-700 uppercase tracking-wider text-xs">Earnings</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Pro-rata Salary</span>
                                        <span>₹{Number(settlement.pending_salary || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Leave Encashment</span>
                                        <span>₹{Number(settlement.leave_encashment || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Gratuity</span>
                                        <span>₹{Number(settlement.gratuity || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Pending Bonus</span>
                                        <span>₹{Number(settlement.bonus_pending || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Other Earnings</span>
                                        <span>₹{Number(settlement.other_earnings || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-dashed border-gray-300 my-2"></div>
                                    <div className="flex justify-between font-bold text-gray-900">
                                        <span>Gross Payable</span>
                                        <span>₹{Number(settlement.gross_payable || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div>
                                <h3 className="text-md font-semibold mb-3 text-red-700 uppercase tracking-wider text-xs">Deductions/Recoveries</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Notice Period Recovery</span>
                                        <span>₹{Number(settlement.notice_period_recovery || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Loan Recovery</span>
                                        <span>₹{Number(settlement.loan_recovery || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Asset Recovery</span>
                                        <span>₹{Number(settlement.it_assets_recovery || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>TDS on F&F</span>
                                        <span>₹{Number(settlement.tds_on_fnf || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Other Recoveries</span>
                                        <span>₹{Number(settlement.other_recoveries || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-dashed border-gray-300 my-2"></div>
                                    <div className="flex justify-between font-bold text-gray-900">
                                        <span>Total Deductions</span>
                                        <span>₹{Number(settlement.total_deductions || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 my-4"></div>

                        {/* Net Pay */}
                        <div className="flex justify-between items-center p-4 bg-brand-500/5 rounded-lg border border-brand-500/20 print:bg-transparent print:border-black print:border-2">
                            <div className="text-lg font-semibold text-brand-500 print:text-black">Net Payable Amount</div>
                            <div className="text-2xl font-bold text-brand-500 print:text-black">₹{Number(settlement.net_payable || 0).toFixed(2)}</div>
                        </div>

                        {/* Remarks / Hold Reason */}
                        {(settlement.hold_reason || settlement.remarks) && (
                            <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm">
                                {settlement.hold_reason && <div className="mb-1"><strong>Hold Reason:</strong> {settlement.hold_reason}</div>}
                                {settlement.remarks && <div><strong>Remarks:</strong> {settlement.remarks}</div>}
                            </div>
                        )}

                        <div className="hidden print:block mt-12 pt-8 border-t border-gray-300">
                            <div className="flex justify-between">
                                <div className="text-center">
                                    <div className="h-16 mb-2 border-b border-gray-300 w-48"></div>
                                    <div className="text-sm">Authorized Signatory</div>
                                </div>
                                <div className="text-center">
                                    <div className="h-16 mb-2 border-b border-gray-300 w-48"></div>
                                    <div className="text-sm">Employee Signature</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default FnFSettlementDetailsPage;
