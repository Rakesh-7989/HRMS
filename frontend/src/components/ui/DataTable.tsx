

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
}

export function DataTable<T>({ data, columns, loading, emptyMessage = "No data found" }: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="w-full h-48 flex items-center justify-center text-muted animate-pulse">
                Loading data...
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-48 flex flex-col items-center justify-center text-muted bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 uppercase text-xs font-semibold">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-border bg-white dark:bg-gray-900">
                    {data.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            {columns.map((col, cIdx) => (
                                <td key={cIdx} className={`px-4 py-3 ${col.className || ''}`}>
                                    {col.cell ? col.cell(row) : (row as any)[col.accessorKey!]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
