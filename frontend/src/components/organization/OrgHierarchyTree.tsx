import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useMotionValue } from 'framer-motion';
import {
    Plus,
    Minus,
    ChevronsDown,
    ChevronsUp,
    Maximize,
    Building2,
    Users,
    MoreVertical,
    Edit2,
    Trash2,
    Share2
} from 'lucide-react';
import { hierarchyService, HierarchyPosition } from '@/services/organization/hierarchy.service';
import { cn } from '@/utils/cn';
import { CreatePositionForm } from '@/components/forms/CreatePositionForm';
import { usePermission } from '@/contexts/PermissionContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showToast } from '@/utils/toast';

// ----------------------------------------------------------------------------
// Types & Helpers
// ----------------------------------------------------------------------------

// Helper to build tree from flat list
const buildTree = (items: HierarchyPosition[]) => {
    const map: Record<string, HierarchyPosition> = {};
    const roots: HierarchyPosition[] = [];

    // First pass: map everything and initialize children array
    items.forEach(item => {
        map[item.id] = { ...item, children: [] };
    });

    // Second pass: link children to parents
    items.forEach(item => {
        if (item.parent_position_id && map[item.parent_position_id]) {
            map[item.parent_position_id].children?.push(map[item.id]);
        } else {
            roots.push(map[item.id]);
        }
    });

    return roots;
};

// ----------------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------------

const HierarchyNode: React.FC<{
    node: HierarchyPosition;
    isRoot?: boolean;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
    onAddChild?: (parentId: string) => void;
    onEdit?: (node: HierarchyPosition) => void;
    onDelete?: (id: string, hasAllocated: boolean) => void;
    canManage: boolean;
}> = ({ node, isRoot, hasChildren, isExpanded, onToggle, onAddChild, onEdit, onDelete, canManage }) => {
    const [showMenu, setShowMenu] = useState(false);
    const hasAllocated = (node.employee_count || 0) > 0;

    // Close menu when clicking outside
    useEffect(() => {
        if (!showMenu) return;
        const close = () => setShowMenu(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showMenu]);

    return (
        <div className="relative group perspective-1000">
            <div className={cn(
                "w-72 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-lg border overflow-hidden transition-all duration-300",
                "hover:shadow-xl hover:scale-[1.02] border-gray-200 dark:border-gray-700",
                isRoot && "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900",
                !node.is_active && "opacity-75 grayscale"
            )}>
                {/* Level Indicator Stripe */}
                <div className={cn(
                    "h-1.5 w-full",
                    node.level === 1 ? "bg-purple-600" :
                        node.level === 2 ? "bg-blue-600" :
                            node.level === 3 ? "bg-emerald-600" :
                                "bg-gray-400"
                )}></div>

                <div className="p-4">
                    <div className="flex justify-between items-start gap-3">
                        {/* Checkbox / Icon to indicate selection could go here */}
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold shadow-inner text-sm",
                            "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}>
                            {node.short_name || (node.name || '?').substring(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate" title={node.name}>
                                {node.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                                    Lvl {node.level}
                                </span>
                                {node.department_name && (
                                    <span className="text-[10px] truncate text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Building2 size={10} />
                                        {node.department_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions Menu */}
                        {canManage && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(!showMenu);
                                    }}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {showMenu && (
                                    <div className="absolute right-0 top-8 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            onClick={() => onAddChild?.(node.id)}
                                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                                        >
                                            <Share2 size={14} className="text-blue-500" />
                                            Add Sub-Position
                                        </button>
                                        <button
                                            onClick={() => onEdit?.(node)}
                                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                                        >
                                            <Edit2 size={14} className="text-orange-500" />
                                            Edit Details
                                        </button>
                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                        <button
                                            onClick={() => onDelete?.(node.id, hasAllocated)}
                                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Employee Count Status */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900/50 p-2 rounded-md">
                        <Users size={12} />
                        <span className="font-medium">
                            {node.employee_count || 0} Employees
                        </span>
                        {hasAllocated && (
                            <div className="flex -space-x-1.5 ml-auto">
                                {(node.employees || []).slice(0, 3).map((emp: any, i: number) => (
                                    <div key={i} className="w-5 h-5 rounded-full border border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[8px] overflow-hidden" title={emp.first_name}>
                                        {emp.profile_photo_url ? (
                                            <img src={emp.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            (emp.first_name || '?')[0]
                                        )}
                                    </div>
                                ))}
                                {(node.employees?.length || 0) > 3 && (
                                    <div className="w-5 h-5 rounded-full border border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[8px] font-medium">
                                        +{(node.employees?.length || 0) - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Expand/Collapse Toggle */}
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle?.();
                        }}
                        className={cn(
                            "absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center transition-all bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700",
                            isExpanded ? "text-primary" : "text-gray-400"
                        )}
                    >
                        {isExpanded ? <ChevronsUp size={14} /> : <ChevronsDown size={14} />}
                    </button>
                )}
            </div>

            {/* Vertical Connector Line */}
            {hasChildren && isExpanded && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
            )}
        </div>
    );
};

const RecursiveTree: React.FC<{
    nodes: HierarchyPosition[];
    isExpanded: (id: string) => boolean;
    toggleNode: (id: string) => void;
    level: number;
    canManage: boolean;
    onAddChild: (id: string) => void;
    onEdit: (node: HierarchyPosition) => void;
    onDelete: (id: string, hasAllocated: boolean) => void;
}> = ({ nodes, isExpanded, toggleNode, level, canManage, onAddChild, onEdit, onDelete }) => {
    return (
        <div className="flex gap-8 justify-center pt-8">
            {nodes.map((node, idx) => {
                const hasChildren = node.children && node.children.length > 0;
                const expanded = isExpanded(node.id);

                return (
                    <div key={node.id} className="flex flex-col items-center relative">
                        {/* Parent Connector (Top) */}
                        <div className="absolute -top-8 w-px h-8 bg-gray-300 dark:bg-gray-600"></div>

                        {/* Horizontal Connector (Sibling Arm) */}
                        {nodes.length > 1 && (
                            <>
                                {/* Left Arm */}
                                {idx > 0 && (
                                    <div className="absolute -top-8 right-1/2 w-[calc(50%+1rem)] h-px bg-gray-300 dark:bg-gray-600"></div>
                                )}
                                {/* Right Arm */}
                                {idx < nodes.length - 1 && (
                                    <div className="absolute -top-8 left-1/2 w-[calc(50%+1rem)] h-px bg-gray-300 dark:bg-gray-600"></div>
                                )}
                            </>
                        )}

                        <HierarchyNode
                            node={node}
                            isRoot={level === 0}
                            hasChildren={hasChildren}
                            isExpanded={expanded}
                            onToggle={() => toggleNode(node.id)}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            canManage={canManage}
                        />

                        {/* Children Recursion */}
                        {hasChildren && expanded && (
                            <div className="relative">
                                <RecursiveTree
                                    nodes={node.children!}
                                    isExpanded={isExpanded}
                                    toggleNode={toggleNode}
                                    level={level + 1}
                                    canManage={canManage}
                                    onAddChild={onAddChild}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const OrgHierarchyTree: React.FC = () => {
    const { hasPermission } = usePermission();
    const canManage = hasPermission('org_hierarchy.manage');
    const { confirm } = useConfirm();
    const queryClient = useQueryClient();

    // UI States
    const [scale, setScale] = useState(0.8);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [isDragging, setIsDragging] = useState(false);

    // Form States
    const [createOpen, setCreateOpen] = useState(false);
    const [editNode, setEditNode] = useState<HierarchyPosition | null>(null);
    const [parentForCreate, setParentForCreate] = useState<string | null>(null);

    // Framer Motion
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const { data: rawPositions = [], isLoading } = useQuery({
        queryKey: ['hierarchy-tree'],
        queryFn: hierarchyService.getHierarchy,
    });

    const treeData = useMemo(() => buildTree(rawPositions), [rawPositions]);

    // Initialize expanded
    useEffect(() => {
        if (rawPositions.length > 0 && Object.keys(expandedIds).length === 0) {
            // Expand roots and first level by default
            const initial: Record<string, boolean> = {};
            treeData.forEach(root => {
                initial[root.id] = true;
                root.children?.forEach(child => {
                    initial[child.id] = true;
                });
            });
            setExpandedIds(initial);
        }
    }, [rawPositions, treeData]);

    const isExpanded = (id: string) => !!expandedIds[id];
    const toggleNode = (id: string) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

    const handleZoom = (delta: number) => {
        setScale(prev => Math.min(1.5, Math.max(0.2, +(prev + delta).toFixed(2))));
    };

    const handleAddChild = (parentId: string) => {
        setParentForCreate(parentId);
        setEditNode(null);
        setCreateOpen(true);
    };

    const handleAddRoot = () => {
        setParentForCreate(null);
        setEditNode(null);
        setCreateOpen(true);
    }

    const handleEdit = (node: HierarchyPosition) => {
        setEditNode(node);
        setParentForCreate(node.parent_position_id);
        setCreateOpen(true);
    };

    const handleDelete = async (id: string, hasAllocated: boolean) => {
        if (hasAllocated) {
            showToast.error("Cannot delete a position that has employees assigned. Reassign them first.");
            return;
        }

        if (await confirm({
            title: 'Delete Position',
            message: 'Are you sure? Any child positions will be moved up to the parent.',
            type: 'destructive'
        })) {
            try {
                await hierarchyService.deletePosition(id);
                queryClient.invalidateQueries({ queryKey: ['hierarchy-tree'] });
                showToast.success('Position deleted');
            } catch (err: any) {
                showToast.error(err.message || 'Failed to delete');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-slate-50 dark:bg-gray-950/50 rounded-xl border border-gray-200 dark:border-gray-800">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <div className="bg-white dark:bg-gray-900 shadow-md rounded-lg p-1 border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
                    <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300"><Plus size={18} /></button>
                    <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300"><Minus size={18} /></button>
                    <button onClick={() => { setScale(0.8); x.set(0); y.set(0); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300"><Maximize size={18} /></button>
                </div>
            </div>

            {/* Empty State / Add Root Button */}
            {treeData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl border text-center pointer-events-auto">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
                        <h3 className="mt-4 font-bold text-lg">No Structure Defined</h3>
                        <p className="text-muted-foreground text-sm mb-4">Start by adding a root position (e.g. CEO)</p>
                        {canManage && (
                            <button onClick={handleAddRoot} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 text-sm font-medium">
                                Add Root Position
                            </button>
                        )}
                    </div>
                </div>
            )}

            {canManage && treeData.length > 0 && (
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={handleAddRoot} className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium flex items-center gap-2">
                        <Plus size={16} />
                        New Root
                    </button>
                </div>
            )}

            {/* Canvas */}
            <div className="flex-1 w-full relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]" ref={containerRef}>
                <motion.div
                    drag
                    dragMomentum={false}
                    style={{ x, y, scale, cursor: isDragging ? 'grabbing' : 'grab' }}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                    className="absolute inset-0 flex items-start justify-center pt-20"
                >
                    <div ref={contentRef} className="pb-32 px-20">
                        {treeData.map(root => (
                            <RecursiveTree
                                key={root.id}
                                nodes={[root]}
                                isExpanded={isExpanded}
                                toggleNode={toggleNode}
                                level={0}
                                canManage={canManage}
                                onAddChild={handleAddChild}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Forms */}
            <CreatePositionForm
                open={createOpen}
                onOpenChange={setCreateOpen}
                editPosition={editNode}
                parentPositionId={parentForCreate}
            />
        </div>
    );
};
