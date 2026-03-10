import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { WFHApprovalsContent } from '@/components/wfh/WFHApprovalsContent';
import { MyWFHRequestsContent } from '@/components/wfh/MyWFHRequestsContent';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';

type SubTab = 'team' | 'wfh-approvals' | 'my-wfh';

export const UnifiedApprovalsContent: React.FC = () => {
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const canApproveAttendance = hasPermission('attendance', 'approve');
    const canApproveWFH = hasPermission('wfh', 'approve');
    const canSeeApprovals = canApproveAttendance || canApproveWFH;

    const [activeSubTab, setActiveSubTab] = useState<SubTab>(canSeeApprovals ? 'wfh-approvals' : 'my-wfh');

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
