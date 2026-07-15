import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue } from 'framer-motion';
import {
    Plus,
    Minus,
    ChevronsDown,
    ChevronsUp,
    Maximize,
    Building2,
    Briefcase
} from 'lucide-react';
import { usersService, OrgTreeNode } from '@/services/users.service';
import { cn } from '@/utils/cn';

// Role-based styling
const ROLE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
    'SUPER_ADMIN': { color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-500/10', border: 'border-brand-200 dark:border-brand-800/50', label: 'Super Admin' },
    'ADMIN': { color: 'text-error-600', bg: 'bg-error-50 dark:bg-error-500/10', border: 'border-error-200 dark:border-error-800/50', label: 'Admin' },
    'MANAGER': { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-800/50', label: 'Manager' },
    'HR': { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-800/50', label: 'HR' },
    'EMPLOYEE': { color: 'text-slate-600', bg: 'bg-neutral-50 dark:bg-neutral-500/10', border: 'border-neutral-200 dark:border-slate-800/50', label: 'Employee' }
};

interface OrgNodeData {
    id: string;
    name: string;
    role?: string;
    initials?: string;
    employeeId?: string;
    designation_name?: string;
    department_name?: string;
    children?: OrgNodeData[];
}

const OrgNode: React.FC<{
    node: OrgNodeData;
    isRoot?: boolean;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
}> = ({ node, isRoot, hasChildren, isExpanded, onToggle }) => {
    const config = ROLE_CONFIG[node.role ?? 'EMPLOYEE'] || ROLE_CONFIG['EMPLOYEE'];
    const initials = node.initials || (node.name || '').charAt(0);

    return (
        <div className="relative group perspective-1000">
            <div className={cn(
                "w-72 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-elev-5 p-4 text-left border overflow-hidden transition-all duration-300",
                "hover:shadow-elev-6 hover:scale-[1.02] active:scale-[0.98] border-white/50 dark:border-gray-700/50",
                isRoot && "ring-2 ring-brand-500 ring-offset-4 dark:ring-offset-gray-900 ring-offset-white"
            )}>
                {/* Accent border at top */}
                <div className={cn("absolute top-0 left-0 right-0 h-1", config.bg.replace('bg-', 'bg-').split(' ')[0])}></div>

                <div className="flex items-start gap-3">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0",
                        config.bg, config.color
                    )}>
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full", config.bg, config.color)}>
                                {config.label}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 font-mono">
                                {node.employeeId || 'ID-NEW'}
                            </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate mt-1">
                            {node.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            <Briefcase size={12} className="shrink-0" />
                            <span className="truncate">{node.designation_name || 'Professional'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 truncate italic">
                            <Building2 size={12} className="shrink-0" />
                            <span className="truncate">{node.department_name || 'General'}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom interactive area if has children */}
                {hasChildren && (
                     <Button variant="ghost" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle?.();
                        }}
                        className={cn(
                            "absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
                            isExpanded ? "bg-amber-500/10 text-amber-600" : "bg-brand-500/10 text-brand-500"
                        )}
                    >
                        {isExpanded ? <Minus size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                    </Button>
                )}
            </div>

            {/* Connecting line to vertical pipe */}
            {hasChildren && isExpanded && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>
            )}
        </div>
    );
};

const RecursiveOrgNode: React.FC<{
    node: OrgNodeData;
    isExpanded: (id: string) => boolean;
    toggleNode: (id: string) => void;
    isRoot?: boolean;
}> = ({ node, isExpanded, toggleNode, isRoot }) => {
    const hasChildren = node.children && node.children.length > 0;
    const expanded = isExpanded(node.id);
    const children = node.children || [];

    return (
        <div className="flex flex-col items-center">
            <OrgNode
                node={node}
                isRoot={isRoot}
                hasChildren={hasChildren}
                isExpanded={expanded}
                onToggle={() => toggleNode(node.id)}
            />

            {hasChildren && expanded && (
                <div className="mt-8">
                    {/* The horizontal line container */}
                    <div className="relative flex justify-center">
                        <div className="flex gap-16 pt-8">
                            {children.map((child: OrgNodeData, idx: number) => (
                                <div key={child.id} className="flex flex-col items-center relative">
                                    {/* Line connecting to horizontal bar */}
                                    <div className="absolute -top-8 w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                                    {/* Horizontal arm logic */}
                                    {children.length > 1 && (
                                        <>
                                            {/* Left side arm */}
                                            {idx > 0 && (
                                                <div className="absolute -top-8 right-1/2 w-[calc(50%+2rem)] h-0.5 bg-gray-300 dark:bg-gray-700"></div>
                                            )}
                                            {/* Right side arm */}
                                            {idx < children.length - 1 && (
                                                <div className="absolute -top-8 left-1/2 w-[calc(50%+2rem)] h-0.5 bg-gray-300 dark:bg-gray-700"></div>
                                            )}
                                        </>
                                    )}

                                    <RecursiveOrgNode
                                        node={child}
                                        isExpanded={isExpanded}
                                        toggleNode={toggleNode}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const OrgTreeContent: React.FC = () => {
    const [scale, setScale] = useState<number>(0.85);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Pan state using motion values for better performance
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const { data: treeData, isLoading: treeLoading } = useQuery<OrgNodeData | null>({
        queryKey: ['org-tree'],
        queryFn: async () => {
            const data = await usersService.getOrgTree();
            if (!data) return null;
            const transform = (node: OrgTreeNode): OrgNodeData => ({
                id: node.id,
                name: `${node.first_name} ${node.last_name}`.trim(),
                role: node.designation,
                employeeId: node.employee_id,
                designation_name: node.designation,
                department_name: node.department,
                children: node.children?.map(transform),
            });
            return transform(data);
        },
    });

    const isExpanded = (id: string) => !!expandedIds[id];
    const toggleNode = (id: string) => setExpandedIds((s) => ({ ...s, [id]: !s[id] }));

    const expandAll = () => {
        if (!treeData) return;
        const all: Record<string, boolean> = {};
        const walk = (n: OrgNodeData) => {
            all[n.id] = true;
            (n.children || []).forEach(walk);
        };
        walk(treeData);
        setExpandedIds(all);
    };

    const collapseAll = () => setExpandedIds({});

    const handleFitToScreen = useCallback(() => {
        if (!containerRef.current || !contentRef.current) return;

        const container = containerRef.current.getBoundingClientRect();
        const content = contentRef.current;

        // Measure real content size (this is tricky with scale, but contentRef usually has it)
        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;

        if (contentWidth === 0) return;

        const pad = 100;
        const targetScale = Math.min(
            (container.width - pad) / contentWidth,
            (container.height - pad) / contentHeight,
            1
        );

        setScale(Math.max(0.3, targetScale));
        x.set(0);
        y.set(0);
    }, [setScale, x, y]);

    // Expand limited depth on load
    useEffect(() => {
        if (treeData) {
            const initialExpanded: Record<string, boolean> = {};
            // Expand ONLY the root and its immediate children (depth <= 1)
            const walk = (n: OrgNodeData, depth: number) => {
                if (depth <= 1) {
                    initialExpanded[n.id] = true;
                }
                if (depth < 1) {
                    (n.children || []).forEach((c: OrgNodeData) => walk(c, depth + 1));
                }
            };
            walk(treeData, 0);
            setExpandedIds(initialExpanded);

            // Initial centering
            setTimeout(handleFitToScreen, 500);
        }
    }, [treeData, handleFitToScreen]);

    const handleZoom = (delta: number) => {
        setScale(prev => {
            const next = +(prev + delta).toFixed(2);
            return Math.min(2, Math.max(0.2, next));
        });
    };

    return (
        <div
            className="relative h-full w-full bg-[#f8fafc] dark:bg-gray-950/40 rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-inner"
            ref={containerRef}
            role="button"
            tabIndex={0}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => { if (e.button === 0) { setIsDragging(true); e.preventDefault(); } }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    setIsDragging(false);
                }
            }}
            onMouseMove={(e) => {
                if (isDragging) {
                    x.set(x.get() + e.movementX);
                    y.set(y.get() + e.movementY);
                }
            }}
        >
            {/* Background pattern for depth */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* Toolbar - Floating Glassmorphic */}
            <div className="absolute right-6 top-6 flex flex-col gap-3 z-30 order-last">
                <div className="flex flex-col gap-2 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-elev-6 border border-white/40 dark:border-gray-700/40">
                     <Button variant="ghost" 
                        title="Fit to Screen"
                        onClick={handleFitToScreen}
                        className="p-2.5 rounded-xl hover:bg-brand-500/10 text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-all active:scale-90"
                    ><Maximize size={20} /></Button>
                    <div className="h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                     <Button variant="ghost" 
                        title="Zoom In"
                        onClick={() => handleZoom(0.1)}
                        className="p-2.5 rounded-xl hover:bg-brand-500/10 text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-all active:scale-90"
                    ><Plus size={20} /></Button>
                     <Button variant="ghost" 
                        title="Zoom Out"
                        onClick={() => handleZoom(-0.1)}
                        className="p-2.5 rounded-xl hover:bg-brand-500/10 text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-all active:scale-90"
                    ><Minus size={20} /></Button>
                    <div className="h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                     <Button variant="ghost" 
                        title="Expand All"
                        onClick={expandAll}
                        className="p-2.5 rounded-xl hover:bg-brand-500/10 text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-all active:scale-90"
                    ><ChevronsDown size={20} /></Button>
                     <Button variant="ghost" 
                        title="Collapse All"
                        onClick={collapseAll}
                        className="p-2.5 rounded-xl hover:bg-brand-500/10 text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-all active:scale-90"
                    ><ChevronsUp size={20} /></Button>
                </div>
            </div>

            {/* Tree Canvas */}
            <motion.div
                ref={contentRef}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    x,
                    y,
                    scale,
                    transformOrigin: 'center center',
                }}
            >
                {treeLoading ? (
                    <div className="flex items-center justify-center h-full w-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-3 border-brand-500 border-t-transparent"></div>
                    </div>
                ) : treeData ? (
                    <RecursiveOrgNode
                        node={treeData}
                        isExpanded={isExpanded}
                        toggleNode={toggleNode}
                        isRoot={true}
                    />
                ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                        <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No organizational data available</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default OrgTreeContent;