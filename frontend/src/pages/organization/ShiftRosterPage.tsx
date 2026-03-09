import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { getShifts } from '@/services/shift.service';
import { departmentService } from '@/services/department.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const ShiftRosterPage = ({ searchTerm = '' }: { searchTerm?: string }) => {
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
            const shift = shifts.find((s: any) => s.id === shiftId);
            if (shift) return shift;
        }
        // Fallback or Legacy check (if applicable, though we want to encourage shift_id usage)
        if (legacyShift && !shiftId) {
            // Maybe try to find by name?
            const shiftByName = shifts.find((s: any) => s.name === legacyShift);
            if (shiftByName) return shiftByName;
            return { name: legacyShift, start_time: 'N/A', end_time: 'N/A' };
        }
        return null;
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '';
        // handle HH:mm:ss
        return timeStr.substring(0, 5);
    };

    const getDepartmentName = (emp: any) => {
        if (emp.department?.name) return emp.department.name;
        if (emp.department_id) {
            const dept = departments.find((d: any) => d.id === emp.department_id);
            return dept ? dept.name : 'No Dept';
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
                    displayEmployees.map((employee: any) => {
                        const shift = getShiftDetails(employee.shift_id, employee.shift);
                        const isAssigned = !!shift;

                        return (
                            <Card key={employee.id} className="overflow-hidden hover:shadow-md transition-shadow p-0">
                                {/* Header */}
                                <div className="p-4 pb-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                                                {(employee.first_name?.[0] || '')}{(employee.last_name?.[0] || '')}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                                    {employee.first_name} {employee.last_name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {employee.employee_id} • {getDepartmentName(employee)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="p-4 pt-4 space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className={`p-2 rounded-lg ${isAssigned ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Assigned Shift</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {isAssigned ? shift.name : 'No Shift Assigned'}
                                            </p>
                                        </div>
                                    </div>

                                    {isAssigned && shift.start_time && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="p-2 rounded-lg bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Timings</p>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
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
            {!loadingEmployees && employees.length > 0 && totalEmployees > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 mt-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalEmployees)} of {totalEmployees} employees
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
                            disabled={(page + 1) * PAGE_SIZE >= totalEmployees}
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
