import React, { useState, useEffect, useCallback } from 'react';
import { PageTransition } from '@/components/ui/PageTransition';
import api from '@/services/api'; // Adjust path if needed
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    Database,
    Terminal,
    Table as TableIcon,
    Play,
    RefreshCcw,
    Search,
    Lock
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { DataTable, Column } from '@/components/ui/DataTable';

export const DBADashboard: React.FC = () => {
    const { t } = useTranslation();

    // Auth State for DBA Console
    const [isLocked, setIsLocked] = useState(true);
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);

    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'explorer' | 'sql'>('sql'); // Default to SQL for power users

    // Data State
    const [tableData, setTableData] = useState<{ columns: Record<string, unknown>[]; rows: Record<string, unknown>[]; total: number } | null>(null);
    const [query, setQuery] = useState('');
    const [queryResult, setQueryResult] = useState<Record<string, unknown> | null>(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [limit, setLimit] = useState(50);

    const fetchTables = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/dba/tables');
            setTables(res.data.tables);
        } catch (err: unknown) {
            showToast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('dba.failedFetchTables'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        // Check if previously unlocked in this session
        const unlocked = sessionStorage.getItem('dba_unlocked');
        if (unlocked === 'true') {
            setIsLocked(false);
            fetchTables();
        }
    }, [fetchTables]);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        try {
            const isValid = await authService.verifyDBAPassword(password);
            if (isValid) {
                setIsLocked(false);
                sessionStorage.setItem('dba_unlocked', 'true');
                showToast.success(t('dba.consoleUnlocked'));
                fetchTables();
            } else {
                showToast.error(t('dba.invalidCredentials'));
            }
        } catch (error) {
            showToast.error(t('dba.verificationFailed'));
        } finally {
            setVerifying(false);
        }
    };

    const fetchTableData = async (tableName: string) => {
        try {
            setLoading(true);
            setSelectedTable(tableName);
            setActiveTab('explorer');

            const res = await api.get(`/dba/tables/${tableName}?limit=${limit}`);
            setTableData(res.data);
        } catch (err: unknown) {
            showToast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('dba.failedFetchTableData'));
        } finally {
            setLoading(false);
        }
    };

    const executeQuery = async () => {
        if (!query.trim()) {
            showToast.error(t('dba.queryEmpty'));
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/dba/query', { query });
            setQueryResult(res.data);
            if (res.data.status === 'success') {
                showToast.success(t('dba.queryExecuted', { duration: res.data.duration }));
            }
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
            const msg = apiErr.response?.data?.message || apiErr.message;
            const detail = apiErr.response?.data?.detail;
            showToast.error(t('dba.queryError', { msg, detail: detail || '' }));
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
                    <h2 className="text-2xl font-bold text-center text-white mb-2">{t('dba.lockedTitle')}</h2>
                    <p className="text-gray-400 text-center mb-8 text-base">
                        {t('dba.lockedDesc')}
                    </p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                                {t('dba.dbaPassword')}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                                placeholder={t('dba.passwordPlaceholder')}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={!password || verifying}
                            variant="destructive"
                            className="w-full py-3 flex items-center justify-center gap-2"
                            isLoading={verifying}
                        >
                            {verifying ? t('dba.verifying') : t('dba.unlockConsole')}
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
                        <span className="font-bold text-lg tracking-tight">{t('dba.consoleName')}</span>
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
                            placeholder={t('dba.filterTables')}
                            className="w-full bg-gray-900 border border-gray-800 rounded pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {tables.length === 0 && !loading ? (
                        <EmptyState title={t('dba.noTables')} compact />
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
                    <span>{t('dba.tablesCount', { count: filteredTables.length })}</span>
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
                            {t('dba.sqlRunner')}
                        </Button>
                        <Button
                            variant={activeTab === 'explorer' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('explorer')}
                            className="px-4 py-1.5 text-sm font-medium"
                        >
                            <TableIcon className="w-4 h-4" />
                            {t('dba.dataExplorer')}
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
                                {t('dba.runQuery')}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
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
                                    placeholder={t('dba.sqlPlaceholder')}
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
                                        {t('dba.queryResults')}
                                    </span>
                                    {queryResult && (
                                        <span className="text-xs text-gray-400 font-mono">
                                            {t('dba.rowsDuration', { count: (queryResult as Record<string, unknown>).rowCount as number, duration: (queryResult as Record<string, unknown>).duration as string })}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto">
                                    {!queryResult ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                            <Terminal className="w-12 h-12 mb-2 opacity-20" />
                                            <p>{t('dba.executeToSee')}</p>
                                        </div>
                                    ) : (
                                        <ResultsTable
                                            columns={(queryResult as Record<string, unknown>).fields as string[]}
                                            rows={(queryResult as Record<string, unknown>).rows as Record<string, unknown>[]}
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
                                                {t('dba.limit')}
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
                                            <DataTable
                                                data={tableData.rows}
                                                columns={tableData.columns.map((col: Record<string, unknown>) => ({
                                                    header: `${col.column_name as string} · ${col.data_type as string}`,
                                                    accessorKey: col.column_name as string,
                                                    cell: (row: Record<string, unknown>) => <CellValue value={row[col.column_name as string]} />,
                                                }))}
                                                pageSize={limit}
                                                pageSizeOptions={[50, 100, 500]}
                                                className="bg-gray-950"
                                            />
                                        ) : (
                                            <div className="p-10 text-center">{t('dba.loadingData')}</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <Database className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg">{t('dba.selectTable')}</p>
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

const CellValue = ({ value }: { value: unknown }) => {
    const { t } = useTranslation();
    if (value === null || value === undefined) {
        return <span className="text-gray-600 italic">{t('dba.nullValue')}</span>;
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

const ResultsTable = ({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) => {
    const { t } = useTranslation();
    if (!rows || rows.length === 0) return <div className="p-4 text-gray-500 italic">{t('dba.noRows')}</div>;

    const tableColumns: Column<Record<string, unknown>>[] = columns.map((col) => ({
        header: col,
        accessorKey: col,
        cell: (row: Record<string, unknown>) => <CellValue value={row[col]} />,
    }));

    return (
        <DataTable
            data={rows}
            columns={tableColumns}
            emptyMessage={t('dba.noRows')}
            pageSize={50}
            pageSizeOptions={[50, 100, 500]}
        />
    );
};
