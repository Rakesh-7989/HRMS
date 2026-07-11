import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Columns3, Settings2, Check, Plus, Trash2, GripVertical } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/Dialog';

import { projectsService } from '@/services/projects.service';
import type { KanbanColumnInput } from '@/types/project.types';

interface KanbanSetupCardProps {
    projectId: string;
    onSetupComplete: () => void;
}

const DEFAULT_COLUMNS: KanbanColumnInput[] = [
    { column_key: 'BACKLOG', column_label: 'Backlog', order_index: 0 },
    { column_key: 'TODO', column_label: 'To Do', order_index: 1 },
    { column_key: 'IN_PROGRESS', column_label: 'In Progress', order_index: 2 },
    { column_key: 'REVIEW', column_label: 'Review', order_index: 3 },
    { column_key: 'DONE', column_label: 'Done', order_index: 4 },
];

export const KanbanSetupCard: React.FC<KanbanSetupCardProps> = ({ projectId, onSetupComplete }) => {
    const queryClient = useQueryClient();
    const [showCustomizeModal, setShowCustomizeModal] = useState(false);
    const [customColumns, setCustomColumns] = useState<KanbanColumnInput[]>(DEFAULT_COLUMNS);
    const [newColumnLabel, setNewColumnLabel] = useState('');

    // Mutation for creating Kanban board
    const createKanbanMutation = useMutation({
        mutationFn: (options: { useDefault: boolean; columns?: KanbanColumnInput[]; forceReset?: boolean }) =>
            projectsService.createKanbanBoard(projectId, options),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kanban-exists', projectId] });
            queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId] });
            onSetupComplete();
        },
        onError: (error) => {
            alert('Failed to create Kanban board. Please try again.');
            console.error('Failed to create Kanban board:', error);
        },
    });

    const handleUseDefault = () => {
        createKanbanMutation.mutate({ useDefault: true, forceReset: true });
    };

    const handleCustomize = () => {
        setShowCustomizeModal(true);
    };

    const handleSaveCustomColumns = () => {
        if (customColumns.length === 0) {
            alert('Please add at least one column.');
            return;
        }
        createKanbanMutation.mutate({ useDefault: false, columns: customColumns, forceReset: true });
        setShowCustomizeModal(false);
    };

    const handleAddColumn = () => {
        if (!newColumnLabel.trim()) {
            alert('Please enter a column name.');
            return;
        }
        const columnKey = newColumnLabel.toUpperCase().replace(/\s+/g, '_');
        const newColumn: KanbanColumnInput = {
            column_key: columnKey,
            column_label: newColumnLabel.trim(),
            order_index: customColumns.length,
        };
        setCustomColumns([...customColumns, newColumn]);
        setNewColumnLabel('');
    };

    const handleRemoveColumn = (index: number) => {
        const updated = customColumns.filter((_, i) => i !== index);
        // Update order_index
        setCustomColumns(updated.map((col, i) => ({ ...col, order_index: i })));
    };

    const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === customColumns.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const updated = [...customColumns];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setCustomColumns(updated.map((col, i) => ({ ...col, order_index: i })));
    };

    const isLoading = createKanbanMutation.isPending;

    return (
        <>
            <Card className="p-8 max-w-2xl mx-auto">
                <div className="text-center space-y-6">
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center">
                        <Columns3 className="w-8 h-8 text-brand-500" />
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Set Up Your Kanban Board
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                            Before you can create tasks, you need to set up your Kanban board columns.
                            Choose a preset or customize your own workflow.
                        </p>
                    </div>

                    {/* Options */}
                    <div className="grid gap-4 md:grid-cols-2 pt-4">
                        {/* Use Default Option */}
                        <button
                            onClick={handleUseDefault}
                            disabled={isLoading}
                            className="group p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-500 hover:bg-brand-500/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    Use Default
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Quick setup with standard columns: Backlog, To Do, In Progress, Review, Done
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1">
                                {['Backlog', 'To Do', 'In Progress', 'Review', 'Done'].map((col) => (
                                    <span
                                        key={col}
                                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                                    >
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </button>

                        {/* Customize Option */}
                        <button
                            onClick={handleCustomize}
                            disabled={isLoading}
                            className="group p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-500 hover:bg-brand-500/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-500/20 rounded-lg flex items-center justify-center">
                                    <Settings2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    Customize
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Create your own workflow with custom columns tailored to your project needs
                            </p>
                            <div className="mt-4">
                                <span className="px-2 py-1 bg-brand-100 dark:bg-brand-500/20 rounded text-xs text-brand-600 dark:text-brand-400">
                                    + Add custom columns
                                </span>
                            </div>
                        </button>
                    </div>

                    {isLoading && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Setting up your board...
                        </p>
                    )}
                </div>
            </Card>

            {/* Customize Modal */}
            <Dialog
                open={showCustomizeModal}
                onOpenChange={setShowCustomizeModal}
                title="Customize Kanban Columns"
            >
                <DialogContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Add, remove, or reorder columns for your Kanban board.
                    </p>

                    {/* Column List */}
                    <div className="space-y-2">
                        {customColumns.map((col, index) => (
                            <div
                                key={col.column_key}
                                className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                <span className="flex-1 font-medium">{col.column_label}</span>
                                <button
                                    type="button"
                                    onClick={() => handleMoveColumn(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    title="Move up"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMoveColumn(index, 'down')}
                                    disabled={index === customColumns.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                    title="Move down"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveColumn(index)}
                                    className="p-1 text-red-400 hover:text-red-600"
                                    title="Remove column"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Column */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label htmlFor="newColumn" className="sr-only">New Column Name</Label>
                            <Input
                                id="newColumn"
                                placeholder="Enter column name..."
                                value={newColumnLabel}
                                onChange={(e) => setNewColumnLabel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                            />
                        </div>
                        <Button type="button" variant="outline" onClick={handleAddColumn}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>
                </DialogContent>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowCustomizeModal(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveCustomColumns}
                        isLoading={isLoading}
                        disabled={customColumns.length === 0}
                    >
                        Create Board
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
};
