import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    iconColor: 'text-red-500',
    buttonVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-500',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-500',
    buttonVariant: 'primary' as const,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  isLoading,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', config.iconBg)}>
              <Icon size={24} className={config.iconColor} />
            </div>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{message}</p>
        </div>
        <DialogFooter className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
