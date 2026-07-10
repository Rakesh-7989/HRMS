import React from 'react';

// Shared skeleton building blocks
const SidebarSkeleton = () => (
    <div className="hidden md:flex flex-col w-[90px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 shrink-0 z-40 relative shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 mx-auto mb-8" />
        <div className="flex flex-col gap-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 mx-auto" />
            ))}
        </div>
    </div>
);

const HeaderSkeleton = () => (
    <header className="sticky top-0 z-30 min-h-[64px] border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 md:px-6 flex items-center justify-between py-2 shadow-sm">
        <div className="flex items-center gap-4 w-1/3">
            <div className="md:hidden w-6 h-6 rounded bg-gray-200 dark:bg-gray-800 shrink-0" />
            <div className="w-32 md:w-48 h-6 rounded-md bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:block w-32 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
    </header>
);

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900 w-full animate-pulse">
        <SidebarSkeleton />
        <div className="flex flex-col flex-1 min-w-0">
            <HeaderSkeleton />
            <main className="p-4 md:p-6 flex-1 overflow-auto">
                {children}
            </main>
        </div>
    </div>
);

// ─── DEFAULT (Generic) ───
export const PageSkeleton: React.FC = () => (
    <AppShell>
        <div className="w-max max-w-full mb-6">
            <div className="w-64 h-5 rounded bg-gray-200 dark:bg-gray-800 mb-2" />
            <div className="w-48 h-4 rounded bg-gray-200 dark:bg-gray-800 opacity-70" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-950 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm h-32 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="w-24 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="w-16 h-8 rounded bg-gray-200 dark:bg-gray-800 mt-4" />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2 min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div className="w-40 h-6 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="w-24 h-8 rounded-md bg-gray-200 dark:bg-gray-800" />
                </div>
                <div className="space-y-4 py-2 mt-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                                <div className="space-y-2">
                                    <div className="w-32 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                                    <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                                </div>
                            </div>
                            <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-800" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-950 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm min-h-[400px]">
                <div className="w-32 h-6 rounded bg-gray-200 dark:bg-gray-800 mb-6" />
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-full h-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    ))}
                </div>
            </div>
        </div>
    </AppShell>
);

// ─── DASHBOARD (stat cards + charts) ───
export const DashboardSkeleton: React.FC = () => (
    <AppShell>
        {/* Title/Welcome area */}
        <div className="mb-6">
            <div className="w-48 h-4 rounded bg-gray-200 dark:bg-gray-800 mb-2" />
            <div className="w-72 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 mb-1" />
            <div className="w-56 h-4 rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-950 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm h-[130px] flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800" />
                    <div>
                        <div className="w-16 h-7 rounded bg-gray-200 dark:bg-gray-800 mb-1" />
                        <div className="w-28 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                </div>
            ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="w-36 h-5 rounded bg-gray-200 dark:bg-gray-800 mb-1" />
                            <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                        </div>
                    </div>
                    <div className="w-full h-[200px] rounded-xl bg-gray-100 dark:bg-gray-800/50" />
                </div>
            ))}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="w-32 h-5 rounded bg-gray-200 dark:bg-gray-800 mb-5" />
                    <div className="space-y-3">
                        {[...Array(3)].map((_, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 h-14" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </AppShell>
);

// ─── TABLE  (search + filters + table rows) ───
export const TableSkeleton: React.FC = () => (
    <AppShell>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
            <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Page title */}
        <div className="w-40 h-7 rounded-lg bg-gray-200 dark:bg-gray-800 mb-6" />

        {/* Action bar: Search + Filter + Add button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 max-w-md h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="w-24 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="w-36 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {[100, 80, 80, 60, 60, 70].map((w, i) => (
                    <div key={i} className={`h-3 rounded bg-gray-200 dark:bg-gray-800`} style={{ width: `${w}px` }} />
                ))}
            </div>

            {/* Table rows */}
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                        <div className="space-y-1.5">
                            <div className="w-32 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                            <div className="w-40 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                        </div>
                    </div>
                    <div className="w-20 h-4 rounded bg-gray-200 dark:bg-gray-800 hidden sm:block" />
                    <div className="w-20 h-4 rounded bg-gray-200 dark:bg-gray-800 hidden md:block" />
                    <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-800 hidden md:block" />
                    <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-800 hidden lg:block" />
                    <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    </div>
                </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <div className="w-48 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    <div className="w-16 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    </AppShell>
);

// ─── TABBED (tabs + content area) ───
export const TabbedSkeleton: React.FC = () => (
    <AppShell>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
            <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Page title */}
        <div className="w-36 h-7 rounded-lg bg-gray-200 dark:bg-gray-800 mb-6" />

        {/* Tab bar */}
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-gray-100 dark:border-gray-800">
            {[80, 100, 72, 88, 68].map((w, i) => (
                <div
                    key={i}
                    className={`h-9 rounded-lg ${i === 0 ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'}`}
                    style={{ width: `${w}px` }}
                />
            ))}
        </div>

        {/* Content area */}
        <div className="space-y-6">
            {/* Action bar inside tab */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-64 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    <div className="w-24 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
                <div className="w-32 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Content cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-950 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800" />
                                <div className="space-y-1">
                                    <div className="w-32 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                                    <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                                </div>
                            </div>
                            <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-800" />
                        </div>
                        <div className="space-y-2">
                            <div className="w-full h-3 rounded bg-gray-100 dark:bg-gray-800" />
                            <div className="w-3/4 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </AppShell>
);

// ─── FORM (form fields layout) ───
export const FormSkeleton: React.FC = () => (
    <AppShell>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
            <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-28 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="w-16 h-3 rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Page title + action buttons */}
        <div className="flex items-center justify-between mb-6">
            <div className="w-48 h-7 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="flex items-center gap-2">
                <div className="w-20 h-9 rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="w-20 h-9 rounded-lg bg-gray-200 dark:bg-gray-800" />
            </div>
        </div>

        {/* Form card */}
        <div className="max-w-4xl">
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
                {/* Section title */}
                <div className="w-40 h-5 rounded bg-gray-200 dark:bg-gray-800 mb-4" />

                {/* Form fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                            <div className="w-full h-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-gray-800" />

                {/* Second section */}
                <div className="w-36 h-5 rounded bg-gray-200 dark:bg-gray-800 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="w-28 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                            <div className="w-full h-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                        </div>
                    ))}
                </div>

                {/* Textarea */}
                <div className="space-y-2">
                    <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="w-full h-24 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <div className="w-24 h-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    <div className="w-28 h-10 rounded-lg bg-gray-300 dark:bg-gray-700" />
                </div>
            </div>
        </div>
    </AppShell>
);

// ─── AUTH (centered card, no sidebar) ───
export const AuthSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6 animate-pulse">
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex justify-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-8">
                {/* Title */}
                <div className="w-48 h-7 rounded-lg bg-gray-200 dark:bg-gray-800 mb-2" />
                <div className="w-64 h-4 rounded bg-gray-200 dark:bg-gray-800 mb-8" />

                {/* Form fields */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        <div className="w-16 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="w-full h-11 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="space-y-2">
                        <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="w-full h-11 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                    </div>
                </div>

                {/* Checkbox + Link */}
                <div className="flex items-center justify-between mt-4 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="w-24 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="w-28 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                </div>

                {/* Submit button */}
                <div className="w-full h-11 rounded-lg bg-gray-300 dark:bg-gray-700" />

                {/* Bottom link */}
                <div className="flex justify-center mt-6">
                    <div className="w-48 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    </div>
);

// ─── MINIMAL (simple content area) ───
export const MinimalSkeleton: React.FC = () => (
    <AppShell>
        {/* Page title */}
        <div className="w-36 h-7 rounded-lg bg-gray-200 dark:bg-gray-800 mb-6" />

        {/* Search bar */}
        <div className="w-full max-w-lg h-12 rounded-xl bg-gray-200 dark:bg-gray-800 mb-6" />

        {/* Content list */}
        <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="w-1/2 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="w-16 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                </div>
            ))}
        </div>
    </AppShell>
);
