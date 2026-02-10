import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';



interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

import { createPortal } from 'react-dom';

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
}) => {
  // Use a portal to render the dialog at the document body level
  // This ensures it sits on top of everything regardless of stacking contexts
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
          />
          {/* Dialog */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden',
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              {(title || description) && (
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800 rounded-t-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      {title && (
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
              {/* Content Wrapper */}
              <div className={cn('flex-1 overflow-y-auto w-full px-6 py-4', !className && 'px-6 py-4')}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => {
  return <div className={cn('space-y-4', className)}>{children}</div>;
};

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}>
      {children}
    </div>
  );
};

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  );
};

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose: React.FC<DialogCloseProps> = ({ asChild, children, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        // This would need access to onOpenChange, but for now we'll handle it in the parent
        props.onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      },
      ...props,
    });
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2',
        props.className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {children}
    </div>
  );
};

