import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { getShifts } from '@/services/shift.service';
import { departmentService } from '@/services/department.service';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Clock, Search, Calendar } from 'lucide-react';

export const ShiftRosterPage = () => {
    const [search, setSearch] = useState('');

    // Fetch Employees
    const { data: employees = [], isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees', search], // Refetch when search changes
        queryFn: () => usersService.getUsers(search ? { search } : undefined),
    });

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
            return { name: legacyShift, start_time: '?', end_time: '?' };
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
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Shift Roster</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        View employee shift assignments and schedules.
                    </p>
                </div>
                {/* Only allow editing if implemented? For now just view. */}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search employees..."
                        className="pl-9 h-10" // Force standard height
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {/* Maybe Department Filter in future */}
            </div>

            {/* Roster Grid/Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loadingEmployees ? (
                    <p className="col-span-full text-center text-gray-500 py-10">Loading roster...</p>
                ) : employees.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 py-10">No employees found.</p>
                ) : (
                    employees.map((employee) => {
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
                                        <div className={`p-2 rounded-lg ${isAssigned ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
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
                                            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
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
        </div>
    );
};
