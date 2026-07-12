
import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    emptyMessage?: string;
    pageSize?: number;
    pageSizeOptions?: number[];
    onRowClick?: (row: T) => void;
}

export function DataTable<T>({
    data,
    columns,
    loading,
    emptyMessage = "No data found",
    pageSize: defaultPageSize = 25,
    pageSizeOptions = [10, 25, 50],
    onRowClick,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<keyof T | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(defaultPageSize);

    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    const paginatedData = useMemo(() => {
        return sortedData.slice(page * pageSize, (page + 1) * pageSize);
    }, [sortedData, page, pageSize]);

    const handleSort = (key: keyof T) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(0);
    };

    if (loading) {
        return <SkeletonTable rows={8} columns={columns.length} />;
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-48 flex flex-col items-center justify-center text-muted bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 uppercase text-xs font-semibold">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-4 py-3 ${col.className || ''} ${col.accessorKey ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-white/10' : ''}`}
                                    onClick={() => col.accessorKey && handleSort(col.accessorKey)}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.header}
                                        {col.accessorKey && sortKey === col.accessorKey && (
                                            sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border bg-white dark:bg-gray-900">
                        {paginatedData.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={() => onRowClick?.(row)} style={onRowClick ? { cursor: 'pointer' } : undefined}>
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx} className={`px-4 py-3 ${col.className || ''}`}>
                                        {col.cell ? col.cell(row) : String(row[col.accessorKey!] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                            className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs"
                        >
                            {pageSizeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs">{page * pageSize + 1}&ndash;{Math.min((page + 1) * pageSize, data.length)} of {data.length}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
