import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { WFHApprovalsContent } from '@/components/wfh/WFHApprovalsContent';
import { MyWFHRequestsContent } from '@/components/wfh/MyWFHRequestsContent';
import { useAuth } from '@/contexts/AuthContext';

type SubTab = 'team' | 'wfh-approvals' | 'my-wfh';

export const UnifiedApprovalsContent: React.FC = () => {
    const { user } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('team');

    // Helper to check if user has access to specific tabs if needed
    // Assuming MANAGER/HR/ADMIN can see team/approvals, everyone can see my-wfh
    // But the parent page tab "Team & Approvals" likely restricts this whole component to MANAGER/HR/ADMIN?
    // Let's check the logic in AttendancePage. "My WFH Requests" was for all. "Team" and "WFH Approvals" for managers.
    // So if a normal employee accesses this, they might only see "My WFH Requests"?
    // The user requested merging "Team and approvals" and "wfh approval" and "My wfh request".
    // "Team & Approvals" tab in AttendancePage was for ['MANAGER', 'HR', 'ADMIN'].
    // "My WFH Requests" was for ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'].

    // So this Unified component needs to handle role visibility internally if it replaces all of them.
    // Or users see all buttons but some are disabled/hidden?

    const canSeeApprovals = ['MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                {canSeeApprovals && (
                    <>
                        <Button
                            variant={activeSubTab === 'wfh-approvals' ? 'primary' : 'outline'}
                            onClick={() => setActiveSubTab('wfh-approvals')}
                            className="rounded-full"
                        >
                            WFH Approvals
                        </Button>
                    </>
                )}
                <Button
                    variant={activeSubTab === 'my-wfh' ? 'primary' : 'outline'}
                    onClick={() => setActiveSubTab('my-wfh')}
                    className="rounded-full"
                >
                    My WFH Requests
                </Button>
            </div>

            <div className="min-h-[400px]">
                {activeSubTab === 'wfh-approvals' && canSeeApprovals && <WFHApprovalsContent />}
                {activeSubTab === 'my-wfh' && <MyWFHRequestsContent />}

                {/* Fallback if user selects a tab they shouldn't see (obscure case) */}
                {(!canSeeApprovals && activeSubTab !== 'my-wfh') && (
                    <div className="text-center py-10 text-gray-500">
                        Access Denied or Invalid Selection
                    </div>
                )}
            </div>
        </div>
    );
};
