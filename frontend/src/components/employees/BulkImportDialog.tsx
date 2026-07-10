import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { usersService } from '@/services/users.service';
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface BulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const REQUIRED_FIELDS = [
    { key: 'email', label: 'Email' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'phone', label: 'Phone' },
];

const OPTIONAL_FIELDS = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'department_id', label: 'Department' },
    { key: 'designation_id', label: 'Designation' },
    { key: 'join_date', label: 'Join Date' },
    { key: 'gender', label: 'Gender' },
    { key: 'marital_status', label: 'Marital Status' },
    { key: 'address', label: 'Address' },
    { key: 'ctc', label: 'Annual CTC' },
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'account_number', label: 'Account Number' },
    { key: 'ifsc_code', label: 'IFSC Code' },
];

export const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ open, onOpenChange, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                const excelHeaders = data[0] as string[];
                setHeaders(excelHeaders || []);

                // Auto-match headers
                const initialMapping: Record<string, string> = {};
                excelHeaders.forEach(header => {
                    const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, '');
                    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
                        const lowerField = field.label.toLowerCase().replace(/[^a-z]/g, '');
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

    const downloadTemplate = () => {
        const templateData = [{
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
        }];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Employees');
        XLSX.writeFile(wb, 'hrms_employee_import_template.xlsx');
    };

    const handleImport = async () => {
        if (!file) return;

        // Check required fields
        const mappedFields = Object.values(mapping);
        const missing = REQUIRED_FIELDS.filter(f => !mappedFields.includes(f.key));
        if (missing.length > 0) {
            showToast.error(`Missing required mappings: ${missing.map(m => m.label).join(', ')}`);
            return;
        }

        setIsLoading(true);
        try {
            const result = await usersService.bulkImport(file, mapping);
            setResults(result.data);
            setStep(3);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            showToast.error(err.message);
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

    return (
        <Dialog 
            open={open} 
            onOpenChange={onOpenChange} 
            onBack={step > 1 ? () => setStep(prev => prev - 1) : () => onOpenChange(false)}
            title="Bulk Employee Import" 
            className="max-w-2xl"
        >
            <div className="p-1">
                {step === 1 && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 bg-gray-50 dark:bg-gray-800/30 transition-all hover:bg-gray-100 dark:hover:bg-gray-800/50">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            <Upload className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Upload Excel File</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
                            Upload an .xlsx or .xls file. Ensure the first row contains column headers.
                        </p>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} className="px-8">
                            Select File
                        </Button>
                        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md">
                            <div
                                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/80"
                                onClick={downloadTemplate}
                            >
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white">Sample File</div>
                                    <div className="text-[10px] text-gray-500">Download Template</div>
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white">Validation</div>
                                    <div className="text-[10px] text-gray-500">Automatic Checks</div>
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
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Map Column Headers</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Match the column names from your Excel file to the HRMS system fields. Required fields are marked with (*).
                                </p>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">Required Fields</h4>
                                    {REQUIRED_FIELDS.map(field => (
                                        <div key={field.key} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                {field.label} *
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                value={Object.keys(mapping).find(h => mapping[h] === field.key) || ''}
                                                onChange={(e) => {
                                                    const newMapping = { ...mapping };
                                                    // Remove existing mapping for this field
                                                    Object.keys(newMapping).forEach(h => { if (newMapping[h] === field.key) delete newMapping[h]; });
                                                    if (e.target.value) newMapping[e.target.value] = field.key;
                                                    setMapping(newMapping);
                                                }}
                                            >
                                                <option value="">Select Column</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">Optional Fields</h4>
                                    {OPTIONAL_FIELDS.map(field => (
                                        <div key={field.key} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                {field.label}
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                value={Object.keys(mapping).find(h => mapping[h] === field.key) || ''}
                                                onChange={(e) => {
                                                    const newMapping = { ...mapping };
                                                    Object.keys(newMapping).forEach(h => { if (newMapping[h] === field.key) delete newMapping[h]; });
                                                    if (e.target.value) newMapping[e.target.value] = field.key;
                                                    setMapping(newMapping);
                                                }}
                                            >
                                                <option value="">Select Column</option>
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
                                <ChevronLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button onClick={handleImport} isLoading={isLoading}>
                                Start Import <ChevronRight className="w-4 h-4 ml-2" />
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
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Import Completed</h3>
                            <p className="text-gray-500">Processing results for {results.total} records</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{results.total}</div>
                                <div className="text-[10px] uppercase font-bold text-gray-400">Total</div>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/50 text-center">
                                <div className="text-2xl font-black text-green-600">{results.success}</div>
                                <div className="text-[10px] uppercase font-bold text-green-500">Success</div>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50 text-center">
                                <div className="text-2xl font-black text-red-600">{results.failed}</div>
                                <div className="text-[10px] uppercase font-bold text-red-500">Failed</div>
                            </div>
                        </div>

                        {results.errors.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" /> Error Details
                                </h4>
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-red-100/50 dark:bg-red-900/30 text-red-900 dark:text-red-200">
                                            <tr>
                                                <th className="px-3 py-2 font-bold">Row</th>
                                                <th className="px-3 py-2 font-bold">Identifier</th>
                                                <th className="px-3 py-2 font-bold">Error Message</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                                            {results.errors.map((err: any, idx: number) => (
                                                <tr key={idx} className="text-red-800 dark:text-red-300">
                                                    <td className="px-3 py-2">{err.row}</td>
                                                    <td className="px-3 py-2 font-medium">{err.email || err.name}</td>
                                                    <td className="px-3 py-2 text-[10px]">{err.error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center pt-4">
                            <Button onClick={() => onOpenChange(false)} className="px-12">
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
};
