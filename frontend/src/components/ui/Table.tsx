import React from 'react';
import { cn } from '@/utils/cn';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className, ...props }) => {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props}>{children}</table>
    </div>
  );
};

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className, ...props }) => {
  return (
    <thead className={cn('[&_tr]:border-b border-gray-200 dark:border-gray-800', className)} {...props}>
      {children}
    </thead>
  );
};

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className, ...props }) => {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>{children}</tbody>
  );
};

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className, onClick, ...props }) => {
  return (
    <tr
      className={cn(
        'border-b border-gray-200 dark:border-gray-800 transition-colors',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
};

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className, ...props }) => {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className, ...props }) => {
  return (
    <td className={cn('p-4 align-middle text-gray-900 dark:text-white', className)} {...props}>
      {children}
    </td>
  );
};


