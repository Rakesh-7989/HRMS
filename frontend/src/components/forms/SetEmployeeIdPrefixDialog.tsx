import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Info, X } from 'lucide-react';
import { tenantService } from '@/services/organization/tenant.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface SetEmployeeIdPrefixDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export const SetEmployeeIdPrefixDialog: React.FC<SetEmployeeIdPrefixDialogProps> = ({
    open,
    onOpenChange,
    onSuccess,
}) => {
    const queryClient = useQueryClient();
    const [prefix, setPrefix] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (prefix: string) => tenantService.setEmployeeIdPrefix(prefix),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['employee-id-settings'] });
            toast.success(`Employee ID prefix set to "${data.prefix}". First employee will be ${data.nextId}`);
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: Error) => {
            setError(err.message);
            toast.error(err.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const upperPrefix = prefix.toUpperCase().trim();
        if (!/^[A-Z]{2,5}$/.test(upperPrefix)) {
            setError('Prefix must be 2-5 uppercase letters (e.g., AM, EMP, GZ)');
            return;
        }

        mutation.mutate(upperPrefix);
    };

    if (!open) return null;

    // Use inline portal to document.body with very high z-index
    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 999999 }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Modal Content */}
            <div
                className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Set Employee ID Prefix
                    </h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Info Banner */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex gap-2">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                    One-time Configuration
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    Employee IDs will auto-increment (AM001, AM002, AM003...)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Prefix <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={prefix}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
                                if (value.length <= 5) {
                                    setPrefix(value);
                                    setError(null);
                                }
                            }}
                            placeholder="e.g., AM, EMP, GZ"
                            maxLength={5}
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg uppercase font-mono tracking-wider"
                        />
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">Preview:</p>
                        <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 10].map((num) => (
                                <span
                                    key={num}
                                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-mono text-sm"
                                >
                                    {prefix || 'XX'}{String(num).padStart(3, '0')}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            <strong>Warning:</strong> Prefix cannot be changed after setting.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!prefix || prefix.length < 2 || mutation.isPending}
                        >
                            {mutation.isPending ? 'Saving...' : 'Set Prefix'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default SetEmployeeIdPrefixDialog;
