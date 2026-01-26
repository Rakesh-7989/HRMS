import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { BoardConfigItem, DEFAULT_BOARD_CONFIG } from './TaskBoard';

interface BoardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: BoardConfigItem[];
    onSave: (newConfig: BoardConfigItem[]) => void;
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
    isOpen,
    onClose,
    currentConfig,
    onSave
}) => {
    const [config, setConfig] = useState<BoardConfigItem[]>(currentConfig);

    // Reset config when modal opens/config changes
    useEffect(() => {
        if (isOpen) {
            setConfig(JSON.parse(JSON.stringify(currentConfig)));
        }
    }, [isOpen, currentConfig]);

    const handleTitleChange = (id: string, newTitle: string) => {
        setConfig(prev => prev.map(item =>
            item.id === id ? { ...item, title: newTitle } : item
        ));
    };

    const handleVisibilityToggle = (id: string) => {
        setConfig(prev => prev.map(item =>
            item.id === id ? { ...item, isVisible: !item.isVisible } : item
        ));
    };

    const handleReset = () => {
        setConfig(DEFAULT_BOARD_CONFIG);
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose} title="Customize Board">
            {/* No internal title needed as Dialog has one, but we use custom content structure */}
            <DialogContent className="max-w-md p-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <Settings size={20} className="text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Board Settings</h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Customize the columns for this project's Kanban board. You can rename columns or hide them if not needed.
                        </p>

                        <div className="space-y-3">
                            {config.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={item.isVisible}
                                        onChange={() => handleVisibilityToggle(item.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        title="Toggle visibility"
                                    />

                                    <div className="flex-1">
                                        <Label htmlFor={`col-${item.id}`} className="sr-only">Column Title</Label>
                                        <Input
                                            id={`col-${item.id}`}
                                            value={item.title}
                                            onChange={(e) => handleTitleChange(item.id, e.target.value)}
                                            className="h-8 text-sm"
                                            disabled={!item.isVisible}
                                            placeholder="Column Title"
                                        />
                                    </div>

                                    <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                        {item.id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                        <RotateCcw size={14} className="mr-1.5" />
                        Reset Defaults
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            <Save size={16} className="mr-1.5" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
