import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/payroll.service';
import type { TaxDeclaration } from '@/types/payroll';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const TaxDeclarationsPage: React.FC = () => {
  const { t } = useTranslation();

    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const currentFy = new Date().getMonth() > 2 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

    //   const [fy, setFy] = useState(currentFy); // Unused setFy
    const [fy] = useState(currentFy);
    const [formData, setFormData] = useState({
        regime: 'NEW',
        section80c: 0,
        section80d: 0,
        hraRent: 0,
        other: 0
    });

    const { data: declaration, isLoading } = useQuery<TaxDeclaration | null, Error, TaxDeclaration | null>({
        queryKey: ['tax-declaration', fy],
        queryFn: async (): Promise<TaxDeclaration | null> => {
            try {
                const result = await payrollService.getTaxDeclaration(fy);
                return result as unknown as TaxDeclaration | null;
            } catch { return null; }
        }
    });

    useEffect(() => {
        if (declaration) {
            setFormData({
                regime: declaration.regime || 'NEW',
                section80c: declaration.section_80c_amount || 0,
                section80d: declaration.section_80d_amount || 0,
                hraRent: declaration.hra_rent_paid || 0,
                other: declaration.other_deductions_amount || 0
            });
        }
    }, [declaration]);

    const submitMut = useMutation({
        mutationFn: (payload: Record<string, unknown>) => payrollService.submitTaxDeclaration(payload),
        onSuccess: () => {
            showToast.success(t('payroll.taxDeclared'));
            queryClient.invalidateQueries({ queryKey: ['tax-declaration'] });
        },
        onError: (err: unknown) => showToast.error(t('payroll.fnfSubmitFailedPrefix') + ((err as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (err as { message?: string }).message))
    });

    const handleSubmit = () => {
        submitMut.mutate({
            financial_year: fy,
            regime: formData.regime as 'OLD' | 'NEW',
            section_80c_amount: Number(formData.section80c),
            section_80d_amount: Number(formData.section80d),
            hra_rent_paid: Number(formData.hraRent),
            other_deductions_amount: Number(formData.other)
        });
    };

    const isEditable = !declaration || declaration.status === 'DRAFT' || declaration.status === 'REJECTED';

    return (
        <DashboardLayout
            title="Tax Declarations"
            breadcrumbs={[{ label: t('common.breadcrumbs.payroll'), href: '/payroll' }, { label: 'Tax Declarations' }]}
            actions={
                <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
            }
        >
            <div className="max-w-3xl mx-auto space-y-6">
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Declaration for FY {fy}</h2>
                        {/* Could add FY selector here if needed */}
                    </div>

                    {isLoading ? <div>{t('common.loading')}</div> : (
                        <div className="space-y-4">
                            {declaration && (
                                <div className={`p-3 rounded mb-4 ${declaration.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                    declaration.status === 'SUBMITTED' ? 'bg-brand-100 text-brand-700' :
                                        declaration.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                                    }`}>
                                    Status: <strong>{declaration.status}</strong>
                                </div>
                            )}

                            <div>
                                <Label>Tax Regime</Label>
                                <select
                                    className="w-full border rounded p-2 mt-1"
                                    value={formData.regime}
                                    onChange={e => setFormData({ ...formData, regime: e.target.value })}
                                    disabled={!isEditable}
                                >
                                    <option value="NEW">New Regime (Default)</option>
                                    <option value="OLD">Old Regime</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">New Regime has lower rates but fewer exemptions.</p>
                            </div>

                            {formData.regime === 'OLD' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Section 80C (Max 1.5L)</Label>
                                            <Input type="number" value={formData.section80c} onChange={e => setFormData({ ...formData, section80c: Number(e.target.value) })} disabled={!isEditable} />
                                        </div>
                                        <div>
                                            <Label>Section 80D (Health Ins.)</Label>
                                            <Input type="number" value={formData.section80d} onChange={e => setFormData({ ...formData, section80d: Number(e.target.value) })} disabled={!isEditable} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>HRA Rent Paid (Yearly)</Label>
                                        <Input type="number" value={formData.hraRent} onChange={e => setFormData({ ...formData, hraRent: Number(e.target.value) })} disabled={!isEditable} />
                                    </div>
                                    <div>
                                        <Label>Other Deductions</Label>
                                        <Input type="number" value={formData.other} onChange={e => setFormData({ ...formData, other: Number(e.target.value) })} disabled={!isEditable} />
                                    </div>
                                </>
                            )}

                            {isEditable ? (
                                <div className="pt-4">
                                    <Button onClick={handleSubmit} isLoading={submitMut.isPending} className="w-full">Submit Declaration</Button>
                                </div>
                            ) : (
                                <div className="pt-4 text-center text-sm text-gray-500">
                                    Declaration submitted on {declaration?.updated_at ? new Date(declaration.updated_at).toLocaleDateString() : ''}.
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
};

export { TaxDeclarationsPage };
