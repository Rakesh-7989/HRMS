import React, { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { usersService } from '@/services/users.service';
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/ui/DataTable';

interface BulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const REQUIRED_FIELDS = [
    { key: 'email', labelKey: 'bulkImport.email' },
    { key: 'first_name', labelKey: 'bulkImport.firstName' },
    { key: 'last_name', labelKey: 'bulkImport.lastName' },
    { key: 'phone', labelKey: 'bulkImport.phone' },
];

const OPTIONAL_FIELDS = [
    { key: 'employee_id', labelKey: 'bulkImport.employeeId' },
    { key: 'department_id', labelKey: 'bulkImport.department' },
    { key: 'designation_id', labelKey: 'bulkImport.designation' },
    { key: 'join_date', labelKey: 'bulkImport.joinDate' },
    { key: 'gender', labelKey: 'bulkImport.gender' },
    { key: 'marital_status', labelKey: 'bulkImport.maritalStatus' },
    { key: 'address', labelKey: 'bulkImport.address' },
    { key: 'ctc', labelKey: 'bulkImport.annualCtc' },
    { key: 'bank_name', labelKey: 'bulkImport.bankName' },
    { key: 'account_number', labelKey: 'bulkImport.accountNumber' },
    { key: 'ifsc_code', labelKey: 'bulkImport.ifscCode' },
];

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ open, onOpenChange, onSuccess }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<{ total: number; success: number; failed: number; errors: Array<{ row: number; email?: string; name?: string; error: string }> } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const buffer = evt.target?.result as ArrayBuffer;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                const worksheet = workbook.worksheets[0];
                const headerRow = worksheet.getRow(1);
                const excelHeaders: string[] = [];
                headerRow.eachCell({ includeEmpty: false }, (cell) => {
                    excelHeaders.push(String(cell.value));
                });
                setHeaders(excelHeaders || []);

                const initialMapping: Record<string, string> = {};
                excelHeaders.forEach(header => {
                    const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, '');
                    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
                        const label = t(field.labelKey);
                        const lowerField = label.toLowerCase().replace(/[^a-z]/g, '');
                        const lowerKey = field.key.toLowerCase().replace(/[^a-z]/g, '');
                        if (lowerHeader === lowerField || lowerHeader === lowerKey) {
                            initialMapping[header] = field.key;
                        }
                    });
                });
                setMapping(initialMapping);
                setStep(2);
            };
            reader.readAsBinaryString(selectedFile);
        }
    };

    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employees');
        worksheet.columns = [
            { header: 'Email', key: 'Email', width: 30 },
            { header: 'First Name', key: 'First Name', width: 15 },
            { header: 'Last Name', key: 'Last Name', width: 15 },
            { header: 'Phone', key: 'Phone', width: 15 },
            { header: 'Employee ID', key: 'Employee ID', width: 15 },
            { header: 'Department', key: 'Department', width: 20 },
            { header: 'Designation', key: 'Designation', width: 20 },
            { header: 'Join Date', key: 'Join Date', width: 15 },
            { header: 'Gender', key: 'Gender', width: 12 },
            { header: 'Marital Status', key: 'Marital Status', width: 15 },
            { header: 'Address', key: 'Address', width: 25 },
            { header: 'Annual CTC', key: 'Annual CTC', width: 15 },
            { header: 'Bank Name', key: 'Bank Name', width: 20 },
            { header: 'Account Number', key: 'Account Number', width: 20 },
            { header: 'IFSC Code', key: 'IFSC Code', width: 15 },
        ];
        worksheet.addRow({
            'Email': 'employee@example.com',
            'First Name': 'John',
            'Last Name': 'Doe',
            'Phone': '1234567890',
            'Employee ID': 'EMP001',
            'Department': 'Engineering',
            'Designation': 'Software Engineer',
            'Join Date': '2024-01-01',
            'Gender': 'Male',
            'Marital Status': 'Single',
            'Address': '123 Main St, City',
            'Annual CTC': '1200000',
            'Bank Name': 'Sample Bank',
            'Account Number': '123456789',
            'IFSC Code': 'SAMP0001234'
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hrms_employee_import_template.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        if (!file) return;

        const mappedFields = Object.values(mapping);
        const missing = REQUIRED_FIELDS.filter(f => !mappedFields.includes(f.key));
        if (missing.length > 0) {
            showToast.error(t('bulkImport.missingMapping', { fields: missing.map(m => t(m.labelKey)).join(', ') }));
            return;
        }

        setIsLoading(true);
        try {
            const result = await usersService.bulkImport(file, mapping);
            setResults(result.data as { total: number; success: number; failed: number; errors: Array<{ row: number; email?: string; name?: string; error: string }> });
            setStep(3);
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            showToast.error((err as { message?: string }).message || 'Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setFile(null);
        setHeaders([]);
        setMapping({});
        setResults(null);
    };

    const errorColumns = [
        { header: t('bulkImport.row'), accessorKey: 'row' as const },
        { header: t('bulkImport.identifier'), cell: (err: { email?: string; name?: string }) => <span className="font-medium">{err.email || err.name}</span> },
        { header: t('bulkImport.errorMessage'), cell: (err: { error: string }) => <span className="text-[10px]">{err.error}</span> },
    ];

    return (
        <Dialog 
            open={open} 
            onOpenChange={onOpenChange} 
            onBack={step > 1 ? () => setStep(prev => prev - 1) : () => onOpenChange(false)}
            title={t('bulkImport.title')} 
            className="max-w-2xl"
        >
            <div className="p-1">
                {step === 1 && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 bg-gray-50 dark:bg-gray-800/30 transition-all hover:bg-gray-100 dark:hover:bg-gray-800/50">
                        <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4 text-brand-500">
                            <Upload className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('bulkImport.uploadTitle')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
                            {t('bulkImport.uploadDesc')}
                        </p>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} className="px-8">
                            {t('bulkImport.selectFile')}
                        </Button>
                        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md">
                            <div
                                role="button"
                                tabIndex={0}
                                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-elev-1 flex items-center gap-3 cursor-pointer hover:border-brand-500/50 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/80"
                                onClick={downloadTemplate}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); downloadTemplate(); } }}
                            >
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white">{t('bulkImport.sampleFile')}</div>
                                    <div className="text-[10px] text-gray-500">{t('bulkImport.downloadTemplate')}</div>
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-elev-1 flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white">{t('bulkImport.validation')}</div>
                                    <div className="text-[10px] text-gray-500">{t('bulkImport.autoChecks')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">{t('bulkImport.mapColumns')}</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {t('bulkImport.mapDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">{t('bulkImport.requiredFields')}</h4>
                                    {REQUIRED_FIELDS.map(field => (
                                        <div key={field.key} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-elev-1">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                {t(field.labelKey)} *
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                                value={Object.keys(mapping).find(h => mapping[h] === field.key) || ''}
                                                onChange={(e) => {
                                                    const newMapping = { ...mapping };
                                                    Object.keys(newMapping).forEach(h => { if (newMapping[h] === field.key) delete newMapping[h]; });
                                                    if (e.target.value) newMapping[e.target.value] = field.key;
                                                    setMapping(newMapping);
                                                }}
                                            >
                                                <option value="">{t('bulkImport.selectColumn')}</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">{t('bulkImport.optionalFields')}</h4>
                                    {OPTIONAL_FIELDS.map(field => (
                                        <div key={field.key} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-elev-1">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                {t(field.labelKey)}
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                                value={Object.keys(mapping).find(h => mapping[h] === field.key) || ''}
                                                onChange={(e) => {
                                                    const newMapping = { ...mapping };
                                                    Object.keys(newMapping).forEach(h => { if (newMapping[h] === field.key) delete newMapping[h]; });
                                                    if (e.target.value) newMapping[e.target.value] = field.key;
                                                    setMapping(newMapping);
                                                }}
                                            >
                                                <option value="">{t('bulkImport.selectColumn')}</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t dark:border-gray-700">
                            <Button variant="ghost" onClick={reset}>
                                <ChevronLeft className="w-4 h-4 mr-2" /> {t('bulkImport.back')}
                            </Button>
                            <Button onClick={handleImport} isLoading={isLoading}>
                                {t('bulkImport.startImport')} <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && results && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center py-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('bulkImport.importCompleted')}</h3>
                            <p className="text-gray-500">{t('bulkImport.processingResults', { count: results.total })}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{results.total}</div>
                                <div className="text-[10px] uppercase font-bold text-gray-400">{t('bulkImport.total')}</div>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/50 text-center">
                                <div className="text-2xl font-black text-green-600">{results.success}</div>
                                <div className="text-[10px] uppercase font-bold text-green-500">{t('bulkImport.success')}</div>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50 text-center">
                                <div className="text-2xl font-black text-red-600">{results.failed}</div>
                                <div className="text-[10px] uppercase font-bold text-red-500">{t('bulkImport.failed')}</div>
                            </div>
                        </div>

                        {results.errors.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" /> {t('bulkImport.errorDetails')}
                                </h4>
                                <DataTable
                                    data={results.errors}
                                    columns={errorColumns}
                                    emptyMessage=""
                                />
                            </div>
                        )}

                        <div className="flex justify-center pt-4">
                            <Button onClick={() => onOpenChange(false)} className="px-12">
                                {t('bulkImport.done')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
};
