import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue } from 'framer-motion';
import {
    Plus,
    Minus,
    ChevronsDown,
    ChevronsUp,
    Maximize,
    Building2,
    Briefcase,
    Grab
} from 'lucide-react';
import { usersService } from '@/services/users.service';
import { cn } from '@/utils/cn';

// Role-based styling
const ROLE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
    'SUPER_ADMIN': { color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-800/50', label: 'Super Admin' },
    'ADMIN': { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-800/50', label: 'Admin' },
    'MANAGER': { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-800/50', label: 'Manager' },
    'HR': { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-800/50', label: 'HR' },
    'EMPLOYEE': { color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-800/50', label: 'Employee' }
};

const OrgNode: React.FC<{
    node: any;
    isRoot?: boolean;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
}> = ({ node, isRoot, hasChildren, isExpanded, onToggle }) => {
    const config = ROLE_CONFIG[node.role] || ROLE_CONFIG['EMPLOYEE'];
    const initials = node.initials || (node.name || '').charAt(0);

    return (
        <div className="relative group perspective-1000">
            <div className={cn(
                "w-72 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl p-4 text-left border overflow-hidden transition-all duration-300",
                "hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] border-white/50 dark:border-gray-700/50",
                isRoot && "ring-2 ring-primary ring-offset-4 dark:ring-offset-gray-900 ring-offset-white"
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
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle?.();
                        }}
                        className={cn(
                            "absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
                            isExpanded ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                        )}
                    >
                        {isExpanded ? <Minus size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                    </button>
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
    node: any;
    isExpanded: (id: string) => boolean;
    toggleNode: (id: string) => void;
    isRoot?: boolean;
}> = ({ node, isExpanded, toggleNode, isRoot }) => {
    const hasChildren = node.children && node.children.length > 0;
    const expanded = isExpanded(node.id);

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
                            {node.children.map((child: any, idx: number) => (
                                <div key={child.id} className="flex flex-col items-center relative">
                                    {/* Line connecting to horizontal bar */}
                                    <div className="absolute -top-8 w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                                    {/* Horizontal arm logic */}
                                    {node.children.length > 1 && (
                                        <>
                                            {/* Left side arm */}
                                            {idx > 0 && (
                                                <div className="absolute -top-8 right-1/2 w-[calc(50%+2rem)] h-0.5 bg-gray-300 dark:bg-gray-700"></div>
                                            )}
                                            {/* Right side arm */}
                                            {idx < node.children.length - 1 && (
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

    const { data: treeData, isLoading: treeLoading } = useQuery({
        queryKey: ['org-tree'],
        queryFn: () => usersService.getOrgTree(),
    });

    const isExpanded = (id: string) => !!expandedIds[id];
    const toggleNode = (id: string) => setExpandedIds((s) => ({ ...s, [id]: !s[id] }));

    // Expand limited depth on load
    useEffect(() => {
        if (treeData) {
            const initialExpanded: Record<string, boolean> = {};
            // Expand ONLY the root and its immediate children (depth <= 1)
            const walk = (n: any, depth: number) => {
                if (depth <= 1) {
                    initialExpanded[n.id] = true;
                }
                if (depth < 1) {
                    (n.children || []).forEach((c: any) => walk(c, depth + 1));
                }
            };
            walk(treeData, 0);
            setExpandedIds(initialExpanded);

            // Initial centering
            setTimeout(handleFitToScreen, 500);
        }
    }, [treeData]);

    const expandAll = () => {
        if (!treeData) return;
        const all: Record<string, boolean> = {};
        const walk = (n: any) => {
            all[n.id] = true;
            (n.children || []).forEach(walk);
        };
        walk(treeData);
        setExpandedIds(all);
    };

    const collapseAll = () => setExpandedIds({});

    const handleFitToScreen = () => {
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
    };

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
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            {/* Background pattern for depth */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* Toolbar - Floating Glassmorphic */}
            <div className="absolute right-6 top-6 flex flex-col gap-3 z-30 order-last">
                <div className="flex flex-col gap-2 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700/40">
                    <button
                        title="Fit to Screen"
                        onClick={handleFitToScreen}
                        className="p-2.5 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-90"
                    ><Maximize size={20} /></button>
                    <div className="h-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
                    <button
                        title="Zoom In"
                        onClick={() => handleZoom(0.1)}
                        className="p-2.5 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-90"
                    ><Plus size={20} /></button>
                    <button
                        title="Zoom Out"
                        onClick={() => handleZoom(-0.1)}
                        className="p-2.5 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-90"
                    ><Minus size={20} /></button>
                    <button
                        title="Reset"
                        onClick={() => { setScale(1); x.set(0); y.set(0); }}
                        className="p-2.5 rounded-xl hover:bg-primary/10 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-90 font-mono text-xs font-bold"
                    >100%</button>
                </div>

                <div className="flex flex-col gap-2 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700/40">
                    <button
                        title="Expand All"
                        onClick={expandAll}
                        className="p-2.5 rounded-xl hover:bg-blue-500/10 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-all active:scale-90"
                    ><ChevronsDown size={20} /></button>
                    <button
                        title="Collapse All"
                        onClick={collapseAll}
                        className="p-2.5 rounded-xl hover:bg-rose-500/10 text-gray-600 dark:text-gray-300 hover:text-rose-500 transition-all active:scale-90"
                    ><ChevronsUp size={20} /></button>
                </div>
            </div>

            {/* Viewport Hints */}
            <div className="absolute left-6 bottom-6 z-20 pointer-events-none">
                <div className="flex items-center gap-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 dark:border-gray-800/20 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">
                        <Grab size={12} />
                        Drag to Pan
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-primary">
                        Scale: {(scale * 100).toFixed(0)}%
                    </div>
                </div>
            </div>

            {/* Tree Container */}
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                {treeLoading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Building Hierarchy...</p>
                    </div>
                ) : !treeData ? (
                    <div className="flex flex-col items-center justify-center gap-4 text-center max-w-sm">
                        <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-3xl">
                            <Building2 className="text-gray-300 dark:text-gray-600 w-16 h-16 mb-4" />
                            <h3 className="font-bold text-gray-900 dark:text-white">Structural Vacuum Detected</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                We couldn't map the hierarchy. Please ensure employees have assigned "Reporting Managers" in their profiles.
                            </p>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        drag
                        dragElastic={0.1}
                        dragMomentum={true}
                        style={{ x, y, scale }}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
                        className="touch-none select-none will-change-transform flex items-center justify-center min-w-max min-h-max"
                    >
                        <div
                            ref={contentRef}
                            className="p-32 flex items-start justify-center"
                        >
                            <RecursiveOrgNode
                                node={treeData}
                                isExpanded={isExpanded}
                                toggleNode={toggleNode}
                                isRoot={true}
                            />
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default OrgTreeContent;
