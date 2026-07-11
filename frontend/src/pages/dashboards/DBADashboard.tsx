import React, { useState, useEffect } from 'react';
import { PageTransition } from '@/components/common/PageTransition';
import api from '@/services/api'; // Adjust path if needed
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';
import {
    Database,
    Terminal,
    Table as TableIcon,
    Play,
    RefreshCcw,
    Search,
    Lock,
    Unlock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const DBADashboard = () => {

    // Auth State for DBA Console
    const [isLocked, setIsLocked] = useState(true);
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);

    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'explorer' | 'sql'>('sql'); // Default to SQL for power users

    // Data State
    const [tableData, setTableData] = useState<{ columns: any[], rows: any[], total: number } | null>(null);
    const [query, setQuery] = useState('');
    const [queryResult, setQueryResult] = useState<any | null>(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [limit, setLimit] = useState(50);

    useEffect(() => {
        // Check if previously unlocked in this session
        const unlocked = sessionStorage.getItem('dba_unlocked');
        if (unlocked === 'true') {
            setIsLocked(false);
            fetchTables();
        }
    }, []);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        try {
            const isValid = await authService.verifyDBAPassword(password);
            if (isValid) {
                setIsLocked(false);
                sessionStorage.setItem('dba_unlocked', 'true');
                toast.success('Console Unlocked');
                fetchTables();
            } else {
                toast.error('Invalid Credentials');
            }
        } catch (error) {
            toast.error('Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const fetchTables = async () => {
        try {
            setLoading(true);
            const res = await api.get('/dba/tables');
            setTables(res.data.tables);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to fetch tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchTableData = async (tableName: string) => {
        try {
            setLoading(true);
            setSelectedTable(tableName);
            setActiveTab('explorer');

            const res = await api.get(`/dba/tables/${tableName}?limit=${limit}`);
            setTableData(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to fetch table data');
        } finally {
            setLoading(false);
        }
    };

    const executeQuery = async () => {
        if (!query.trim()) {
            toast.error('Query cannot be empty');
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/dba/query', { query });
            setQueryResult(res.data);
            if (res.data.status === 'success') {
                toast.success(`Query executed in ${res.data.duration}`);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            const detail = err.response?.data?.detail;
            toast.error(`${msg} ${detail ? `(${detail})` : ''}`);
            setQueryResult(null);
        } finally {
            setLoading(false);
        }
    };

    const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    if (isLocked) {
        return (
            <PageTransition className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-elev-6">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                            <Lock className="w-8 h-8 text-red-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Restricted Access</h2>
                    <p className="text-gray-400 text-center mb-8 text-base">
                        This is a restricted area for Database Administrators only.
                        Please verify your identity to continue.
                    </p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                                DBA Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                                placeholder="Enter your password..."
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={!password || verifying}
                            variant="destructive"
                            className="w-full py-3 flex items-center justify-center gap-2"
                            isLoading={verifying}
                        >
                            {verifying ? 'Verifying...' : 'Unlock Console'}
                        </Button>
                    </form>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition className="flex h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Sidebar - Tables List */}
            <div className="w-64 flex flex-col border-r border-gray-800 bg-gray-950">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-brand-400" />
                        <span className="font-bold text-lg tracking-tight">DBA Console</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchTables} aria-label="Refresh tables" isLoading={loading}>
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="p-2 border-b border-gray-800">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter tables..."
                            className="w-full bg-gray-900 border border-gray-800 rounded pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {tables.length === 0 && !loading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No tables found</div>
                    ) : (
                        <div className="py-2">
                            {filteredTables.map(table => (
                                <Button
                                    key={table}
                                    onClick={() => fetchTableData(table)}
                                    variant="ghost"
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${selectedTable === table
                                        ? 'bg-brand-500/10 text-brand-400 border-r-2 border-brand-500'
                                        : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                                        }`}
                                    aria-label={`View table ${table}`}
                                >
                                    <TableIcon className="w-3.5 h-3.5 opacity-70" />
                                    <span className="truncate">{table}</span>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-800 text-xs text-gray-600 flex justify-between">
                    <span>{filteredTables.length} tables</span>
                    <span>v1.0.0</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
                {/* Toolbar / Tabs */}
                <div className="h-14 border-b border-gray-800 bg-gray-950 flex items-center px-4 justify-between">
                    <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
                        <Button
                            variant={activeTab === 'sql' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('sql')}
                            className="px-4 py-1.5 text-sm font-medium"
                        >
                            <Terminal className="w-4 h-4" />
                            SQL Runner
                        </Button>
                        <Button
                            variant={activeTab === 'explorer' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('explorer')}
                            className="px-4 py-1.5 text-sm font-medium"
                        >
                            <TableIcon className="w-4 h-4" />
                            Data Explorer
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'sql' && (
                            <Button
                                onClick={executeQuery}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold"
                                isLoading={loading}
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Run Query (Ctrl+Enter)
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setIsLocked(true);
                                sessionStorage.removeItem('dba_unlocked');
                            }}
                            aria-label="Lock Console"
                        >
                            <Lock className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                        </div>
                    )}

                    {/* SQL Runner View */}
                    {activeTab === 'sql' && (
                        <div className="h-full flex flex-col">
                            {/* Editor */}
                            <div className="flex-1 p-4 relative">
                                <textarea
                                    className="w-full h-full bg-gray-950 text-green-400 font-mono text-sm border border-gray-800 rounded p-4 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none shadow-inner"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="-- Write your SQL query here
SELECT * FROM users LIMIT 10;"
                                    spellCheck={false}
                                    onKeyDown={(e) => {
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                            executeQuery();
                                        }
                                    }}
                                />
                            </div>

                            {/* Results Pane */}
                            <div className="h-1/2 border-t border-gray-800 bg-gray-900 flex flex-col">
                                <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 flex justify-between items-center">
                                    <span className="text-xs uppercase tracking-wider font-bold text-gray-500">
                                        Query Results
                                    </span>
                                    {queryResult && (
                                        <span className="text-xs text-gray-400 font-mono">
                                            {queryResult.rowCount} rows • {queryResult.duration}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto">
                                    {!queryResult ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                            <Terminal className="w-12 h-12 mb-2 opacity-20" />
                                            <p>Execute a query to see results here</p>
                                        </div>
                                    ) : (
                                        <ResultsTable
                                            columns={queryResult.fields}
                                            rows={queryResult.rows}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Explorer View */}
                    {activeTab === 'explorer' && (
                        <div className="h-full flex flex-col">
                            {selectedTable ? (
                                <>
                                    <div className="p-4 bg-gray-950 border-b border-gray-800 flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <TableIcon className="w-5 h-5 text-brand-500" />
                                            {selectedTable}
                                        </h2>
                                        <div className="flex gap-2">
                                            <span className="text-sm text-gray-400 self-center mr-4">
                                                Limit:
                                                <select
                                                    value={limit}
                                                    onChange={(e) => {
                                                        setLimit(Number(e.target.value));
                                                        // Ideally re-fetch here but simplistic for now
                                                    }}
                                                    className="ml-2 bg-gray-800 border-none rounded text-white text-xs py-1"
                                                >
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                    <option value={500}>500</option>
                                                </select>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto bg-gray-900 p-4">
                                        {tableData ? (
                                            <div className="border border-gray-800 rounded-lg overflow-hidden shadow-elev-5">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead className="bg-gray-800 text-gray-400 font-medium">
                                                            <tr>
                                                                {tableData.columns.map((col: any) => (
                                                                    <th key={col.column_name} className="px-4 py-3 border-b border-gray-700">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-200">{col.column_name}</span>
                                                                            <span className="text-[10px] text-gray-500 font-mono">{col.data_type}</span>
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-800 bg-gray-950">
                                                            {tableData.rows.map((row: any, i: number) => (
                                                                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                                                                    {tableData.columns.map((col: any) => (
                                                                        <td key={col.column_name} className="px-4 py-2 text-gray-300 border-r border-gray-800/30 last:border-r-0">
                                                                            <CellValue value={row[col.column_name]} />
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center">Loading data...</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <Database className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg">Select a table from the sidebar to explore data</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </PageTransition>
    );
};

// Start Helper Components

const CellValue = ({ value }: { value: any }) => {
    if (value === null || value === undefined) {
        return <span className="text-gray-600 italic">null</span>;
    }
    if (typeof value === 'boolean') {
        return (
            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${value ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                {String(value)}
            </span>
        );
    }
    if (typeof value === 'object') {
        return <span className="text-brand-400 font-mono text-xs">{JSON.stringify(value).substring(0, 30)}{JSON.stringify(value).length > 30 ? '...' : ''}</span>;
    }
    return <span className="font-mono text-xs text-gray-300">{String(value)}</span>;
};

const ResultsTable = ({ columns, rows }: { columns: string[], rows: any[] }) => {
    if (!rows || rows.length === 0) return <div className="p-4 text-gray-500 italic">No rows returned</div>;

    return (
        <div className="w-full">
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                <thead className="bg-gray-800 text-gray-400 font-medium sticky top-0 z-10">
                    <tr>
                        {columns.map((col) => (
                            <th key={col} className="px-4 py-2 border-b border-gray-700 bg-gray-800">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-950">
                    {rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                            {columns.map((col) => (
                                <td key={col} className="px-4 py-2 text-gray-300 border-r border-gray-800/30 last:border-r-0 font-mono text-xs">
                                    <CellValue value={row[col]} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
