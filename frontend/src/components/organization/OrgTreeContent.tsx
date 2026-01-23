import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, ZoomIn, ChevronsDown, ChevronsUp, Maximize, Move } from 'lucide-react';
import { usersService } from '@/services/users.service';

const OrgNode: React.FC<{ name: string; title?: string; initials?: string }> = ({ name, title, initials }) => (
    <div className="w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg p-4 text-left border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow cursor-default group">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-10 to-primary-5 text-primary font-semibold flex items-center justify-center text-sm shadow-sm border border-primary/10 group-hover:scale-105 transition-transform">{initials || name.charAt(0)}</div>
            <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors">{name}</div>
                <div className="text-xs text-muted text-gray-500 dark:text-gray-400">{title}</div>
            </div>
        </div>
    </div>
);

// Recursive component for rendering the tree
const RecursiveOrgNode: React.FC<{
    node: any;
    isExpanded: (id: string) => boolean;
    toggleNode: (id: string) => void;
    depth?: number
}> = ({ node, isExpanded, toggleNode, depth = 0 }) => {
    const hasChildren = node.children && node.children.length > 0;
    const expanded = isExpanded(node.id);

    return (
        <div className="flex flex-col items-center">
            <div className="relative z-10 transition-all duration-300 ease-in-out">
                <OrgNode name={node.name} title={node.title} initials={node.initials} />

                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNode(node.id);
                        }}
                        className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all border-2 border-white dark:border-gray-900 z-20 ${expanded ? 'bg-gray-700 text-white hover:bg-gray-900' : 'bg-primary text-white hover:bg-primary/90'}`}
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? <Minus size={12} /> : <Plus size={12} />}
                    </button>
                )}
            </div>

            {hasChildren && expanded && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Connecting line to children */}
                    <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>

                    {/* Horizontal line connecting children */}
                    <div className="flex items-start justify-center relative">
                        {node.children.length > 1 && (
                            <div className="absolute top-0 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600 w-[calc(100%-4rem)] mx-auto"></div>
                        )}

                        <div className="flex gap-8 pt-4">
                            {node.children.map((child: any) => (
                                <div key={child.id} className="flex flex-col items-center relative">
                                    {/* Vertical connector from horizontal line to child */}
                                    <div className="absolute -top-4 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>

                                    <RecursiveOrgNode
                                        node={child}
                                        isExpanded={isExpanded}
                                        toggleNode={toggleNode}
                                        depth={depth + 1}
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
    const [scale, setScale] = useState<number>(1);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const { data: treeData, isLoading: treeLoading } = useQuery({
        queryKey: ['org-tree'],
        queryFn: () => usersService.getOrgTree(),
    });

    const isExpanded = (id: string) => !!expandedIds[id];
    const toggleNode = (id: string) => setExpandedIds((s) => ({ ...s, [id]: !s[id] }));

    // Expand all on load or when data changes
    useEffect(() => {
        if (treeData) {
            expandAll();
        }
    }, [treeData]);

    const expandAll = () => {
        if (!treeData) return;
        interface TreeNode { id: string; children?: TreeNode[] }
        const all: Record<string, boolean> = {};
        const walk = (n: TreeNode) => {
            all[n.id] = true;
            (n.children || []).forEach(walk);
        };
        walk(treeData as TreeNode);
        setExpandedIds(all);
    };

    const collapseAll = () => setExpandedIds({});

    const handleFitToScreen = () => {
        if (!containerRef.current || !contentRef.current) return;

        // Reset scale first to get accurate natural dimensions
        setScale(1);

        // We use a small timeout to let the DOM render at scale 1 before measuring
        setTimeout(() => {
            if (!containerRef.current || !contentRef.current) return;

            const container = containerRef.current.getBoundingClientRect();
            const content = contentRef.current.getBoundingClientRect();

            // Calculate padding (keep some space around)
            const padding = 80;
            const availableWidth = container.width - padding;
            const availableHeight = container.height - padding;

            // Current content dimensions might be affected by previous scale if not fully reset?
            // Since we set scale to 1 instantly, reflow should happen. 
            // Better logic: use scrollWidth/scrollHeight from the element directly.

            // Using scrollWidth/scrollHeight from the contentRef helps capture the full size including overflow
            const contentWidth = contentRef.current.scrollWidth;
            const contentHeight = contentRef.current.scrollHeight;

            if (contentWidth === 0 || contentHeight === 0) return;

            const scaleX = availableWidth / contentWidth;
            const scaleY = availableHeight / contentHeight;

            // Choose the smaller scale to fit both dimensions
            // Clamp max scale to 1.2 to avoid getting too huge on small trees
            let newScale = Math.min(scaleX, scaleY);
            newScale = Math.min(newScale, 1.2);
            newScale = Math.max(newScale, 0.2); // Min limit to prevent invisibility

            setScale(parseFloat(newScale.toFixed(2)));
        }, 50);
    };

    return (
        <div className="relative h-full w-full bg-gray-50/50 dark:bg-gray-900/20 rounded-lg overflow-hidden border border-dashed border-gray-200 dark:border-gray-800" ref={containerRef}>
            {/* Toolbar */}
            <div className="absolute right-4 top-4 flex flex-col gap-2 z-30 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col gap-1">
                    <button
                        title="Fit to Screen"
                        onClick={handleFitToScreen}
                        className="p-2 rounded hover:bg-primary-50 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                    ><Maximize size={18} /></button>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5 w-full"></div>
                    <button
                        title="Zoom In"
                        onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    ><Plus size={18} /></button>
                    <button
                        title="Zoom Out"
                        onClick={() => setScale((s) => Math.max(0.2, +(s - 0.1).toFixed(2)))}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    ><Minus size={18} /></button>
                    <button
                        title="Reset (100%)"
                        onClick={() => setScale(1)}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    ><ZoomIn size={18} /></button>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5 w-full"></div>
                <div className="flex flex-col gap-1">
                    <button
                        title="Expand All"
                        onClick={expandAll}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    ><ChevronsDown size={18} /></button>
                    <button
                        title="Collapse All"
                        onClick={collapseAll}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    ><ChevronsUp size={18} /></button>
                </div>
            </div>

            {/* Tree Viewport */}
            <div className="w-full h-full overflow-auto cursor-grab active:cursor-grabbing custom-scrollbar">
                {treeLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            <p className="text-sm text-muted">Loading hierarchy...</p>
                        </div>
                    </div>
                ) : !treeData ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted">
                        <p>No organization hierarchy found.</p>
                        <p className="text-sm">Ensure employees have "Reports To" assigned.</p>
                    </div>
                ) : (
                    <div className="min-w-full min-h-full flex items-start justify-center p-20 origin-top">
                        <div
                            ref={contentRef}
                            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                            className="transition-transform duration-300 ease-out py-8"
                        >
                            <RecursiveOrgNode
                                node={treeData}
                                isExpanded={isExpanded}
                                toggleNode={toggleNode}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
