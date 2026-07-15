import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { getShifts } from '@/services/shift.service';
import { departmentService } from '@/services/department.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
export const ShiftRosterPage: React.FC<{ searchTerm?: string }> = ({ searchTerm = '' }) => {
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 16;
    const search = searchTerm;

    // Reset page on search
    useEffect(() => {
        setPage(0);
    }, [search]);

    // Fetch Employees with Pagination
    const { data: usersResponse, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees', search, page],
        queryFn: () => usersService.getUsers({
            search: search || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE
        }),
    });

    const employees = usersResponse?.data || [];
    const totalEmployees = usersResponse?.pagination?.total || employees.length;
    const displayEmployees = employees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Fetch Shifts (to map IDs to details)
    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => getShifts(),
    });

    // Fetch Departments (Fix for missing dept names)
    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: () => departmentService.getDepartments(),
    });

    // Helper to get shift details
    const getShiftDetails = (shiftId?: string, legacyShift?: string) => {
        if (shiftId) {
            const shift = (shifts as unknown as Record<string, unknown>[]).find((s: Record<string, unknown>) => s.id === shiftId);
            if (shift) return shift as unknown as Record<string, unknown>;
        }
        // Fallback or Legacy check (if applicable, though we want to encourage shift_id usage)
        if (legacyShift && !shiftId) {
            // Maybe try to find by name?
            const shiftByName = (shifts as unknown as Record<string, unknown>[]).find((s: Record<string, unknown>) => s.name === legacyShift);
            if (shiftByName) return shiftByName as unknown as Record<string, unknown>;
            return { name: legacyShift, start_time: 'N/A', end_time: 'N/A' } as unknown as Record<string, unknown>;
        }
        return null;
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '';
        // handle HH:mm:ss
        return timeStr.substring(0, 5);
    };

    const getDepartmentName = (emp: Record<string, unknown>) => {
        const deptRecord = emp.department as Record<string, unknown> | undefined;
        if (deptRecord?.name) return deptRecord.name as string;
        if (emp.department_id) {
            const dept = (departments as unknown as Record<string, unknown>[]).find((d: Record<string, unknown>) => d.id === emp.department_id);
            return dept ? (dept.name as string) : 'No Dept';
        }
        return 'No Dept';
    };

    return (
        <div className="p-2 space-y-6">
            {/* Roster Grid/Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loadingEmployees ? (
                    <p className="col-span-full text-center text-gray-500 py-10">Loading roster...</p>
                ) : employees.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 py-10">No employees found.</p>
                ) : (
                    (displayEmployees as unknown as Record<string, unknown>[]).map((employee: Record<string, unknown>) => {
                        const shift = getShiftDetails(employee.shift_id as string, employee.shift as string);
                        const isAssigned = !!shift;

                        return (
                            <Card key={employee.id as string} className="overflow-hidden hover:shadow-elev-3 transition-shadow p-0">
                                {/* Header */}
                                <div className="p-4 pb-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold overflow-hidden">
                                                {((employee.first_name as string)?.[0] || '')}{((employee.last_name as string)?.[0] || '')}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                                    {employee.first_name as string} {employee.last_name as string}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {employee.employee_id as string} • {getDepartmentName(employee)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="p-4 pt-4 space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className={`p-2 rounded-lg ${isAssigned ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Assigned Shift</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {isAssigned ? (shift as Record<string, unknown>).name as string : 'No Shift Assigned'}
                                            </p>
                                        </div>
                                    </div>

                                    {isAssigned && (shift as Record<string, unknown>).start_time as string && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="p-2 rounded-lg bg-coral-50 text-coral-600 dark:bg-coral-500/10 dark:text-coral-300">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Timings</p>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {formatTime((shift as Record<string, unknown>).start_time as string)} - {formatTime((shift as Record<string, unknown>).end_time as string)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {!isAssigned && (
                                        <div className="flex items-center justify-center h-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                            <p className="text-xs text-gray-400">Regular 9-6 (Default)</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {!loadingEmployees && employees.length > 0 && (totalEmployees as number) > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 mt-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalEmployees as number)} of {totalEmployees as number} employees
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Page {page + 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={(page + 1) * PAGE_SIZE >= (totalEmployees as number)}
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
