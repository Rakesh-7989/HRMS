import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog, ConfirmDialogProps } from '@/components/ui/ConfirmDialog';

type ConfirmOptions = Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<string | boolean | undefined>;
    alert: (options: Omit<ConfirmOptions, 'type'>) => Promise<void>;
    prompt: (options: Omit<ConfirmOptions, 'type'>) => Promise<string | undefined>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialogConfig, setDialogConfig] = useState<(ConfirmOptions & { resolve: (val: any) => void }) | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<string | boolean | undefined>((resolve) => {
            setDialogConfig({
                ...options,
                resolve,
            });
        });
    }, []);

    const alert = useCallback((options: Omit<ConfirmOptions, 'type'>) => {
        return new Promise<void>((resolve) => {
            setDialogConfig({
                ...options,
                type: 'info',
                resolve: () => resolve(),
            });
        });
    }, []);

    const prompt = useCallback((options: Omit<ConfirmOptions, 'type'>) => {
        return new Promise<string | undefined>((resolve) => {
            setDialogConfig({
                ...options,
                type: 'prompt',
                resolve,
            });
        });
    }, []);

    const handleClose = useCallback(() => {
        if (dialogConfig) {
            dialogConfig.resolve(false);
            setDialogConfig(null);
        }
    }, [dialogConfig]);

    const handleConfirm = useCallback((value?: string) => {
        if (dialogConfig) {
            dialogConfig.resolve(dialogConfig.type === 'prompt' ? value : true);
            setDialogConfig(null);
        }
    }, [dialogConfig]);

    return (
        <ConfirmContext.Provider value={{ confirm, alert, prompt }}>
            {children}
            {dialogConfig && (
                <ConfirmDialog
                    isOpen={!!dialogConfig}
                    onClose={handleClose}
                    onConfirm={handleConfirm}
                    {...dialogConfig}
                />
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
