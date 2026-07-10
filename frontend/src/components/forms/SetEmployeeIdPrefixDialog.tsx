import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { AlertCircle, Info } from 'lucide-react';
import { tenantService } from '@/services/tenant.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

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

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            onBack={() => onOpenChange(false)}
            title="Set Employee ID Prefix"
            description="One-time configuration for your organization's employee ID format"
            className="max-w-md"
        >
            <form onSubmit={handleSubmit} className="p-1 space-y-5">
                {/* Info Banner */}
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <Info className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-sm text-violet-700 dark:text-violet-300 font-bold uppercase tracking-wider text-[10px]">
                                One-time Configuration
                            </p>
                            <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5 font-medium leading-relaxed">
                                IDs will auto-increment (e.g., {prefix || 'EMP'}001, {prefix || 'EMP'}002...)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-start gap-2 animate-shake">
                        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-rose-700 dark:text-rose-400 font-medium">{error}</p>
                    </div>
                )}

                {/* Input */}
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                        Prefix <span className="text-rose-500">*</span>
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
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-xl uppercase font-black tracking-[0.2em] transition-all shadow-sm"
                    />
                    <p className="text-[9px] text-gray-400 font-medium ml-1">Must be 2-5 uppercase characters</p>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">Sequence Projection:</p>
                    <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 10].map((num) => (
                            <span
                                key={num}
                                className="px-3 py-1.5 bg-white dark:bg-gray-800 text-primary border border-primary/10 dark:border-primary/20 rounded-xl font-black text-xs shadow-sm"
                            >
                                {prefix || 'XX'}{String(num).padStart(3, '0')}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Warning */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight">
                        <strong>Warning:</strong> The prefix cannot be modified once set.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={mutation.isPending}
                        className="rounded-2xl border-slate-200 dark:border-white/10 text-slate-500 font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={!prefix || prefix.length < 2 || mutation.isPending}
                        isLoading={mutation.isPending}
                        className="rounded-2xl bg-primary text-white font-bold min-w-[140px]"
                    >
                        Set Prefix
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default SetEmployeeIdPrefixDialog;
