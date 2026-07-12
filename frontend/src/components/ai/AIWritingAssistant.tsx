import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useMutation } from '@tanstack/react-query';
import { aiService } from '@/services/ai.service';
import { Sparkles, Loader2, X, Wand2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AIWritingAssistantProps {
  targetTextArea: HTMLTextAreaElement | null;
  onClose: () => void;
}

const PROMPT_OPTIONS = [
  { label: 'Professional tone', prompt: 'Rewrite this in a professional tone: ' },
  { label: 'Shorten', prompt: 'Summarize this concisely: ' },
  { label: 'Expand', prompt: 'Expand this with more detail: ' },
  { label: 'Formal', prompt: 'Make this more formal: ' },
  { label: 'Friendly', prompt: 'Make this more friendly and approachable: ' },
];

export const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({ targetTextArea, onClose }) => {
  const [mode, setMode] = useState<'options' | 'custom'>('options');
  const [customPrompt, setCustomPrompt] = useState('');

  const generateMutation = useMutation({
    mutationFn: (prompt: string) => aiService.generateContent(prompt),
    onSuccess: (res) => {
      if (targetTextArea) {
        const start = targetTextArea.selectionStart;
        const end = targetTextArea.selectionEnd;
        const text = targetTextArea.value;
        targetTextArea.value = text.substring(0, start) + res.data.content + text.substring(end);
        targetTextArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onClose();
    },
  });

  const selectedText = targetTextArea
    ? targetTextArea.value.substring(targetTextArea.selectionStart, targetTextArea.selectionEnd)
    : '';

  const handleOption = (option: typeof PROMPT_OPTIONS[0]) => {
    const prompt = selectedText ? `${option.prompt}"${selectedText}"` : option.prompt;
    generateMutation.mutate(prompt);
  };

  return (
    <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-neutral-900 rounded-2xl shadow-elev-6 border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-bold text-neutral-900 dark:text-white">AI Writing</span>
        </div>
         <Button variant="ghost" onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <X size={14} className="text-neutral-400" />
        </Button>
      </div>

      {generateMutation.isPending ? (
        <div className="flex items-center justify-center gap-2 p-6">
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          <span className="text-sm text-neutral-500">Generating...</span>
        </div>
      ) : (
        <div className="p-3 space-y-1">
          {mode === 'options' ? (
            <>
              {selectedText && (
                <p className="text-xs text-neutral-400 px-2 pb-2 truncate">
                  Selected: "{selectedText.slice(0, 40)}..."
                </p>
              )}
              {PROMPT_OPTIONS.map((opt) => (
                 <Button variant="ghost" 
                  key={opt.label}
                  onClick={() => handleOption(opt)}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-neutral-700 dark:text-neutral-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 transition-all"
                >
                  <Sparkles size={12} className="inline mr-2 text-brand-400" />
                  {opt.label}
                </Button>
              ))}
               <Button variant="ghost" 
                onClick={() => setMode('custom')}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all"
              >
                Custom prompt...
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <textarea
                autoFocus
                placeholder="Describe what you want to write..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                rows={3}
              />
              <div className="flex gap-2">
                 <Button variant="ghost" 
                  onClick={() => setMode('options')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                >
                  Back
                </Button>
                 <Button variant="ghost" 
                  onClick={() => generateMutation.mutate(customPrompt)}
                  disabled={!customPrompt.trim()}
                  className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 disabled:opacity-50"
                >
                  Generate
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const useAIWritingAssistant = () => {
  const [activeField, setActiveField] = useState<HTMLTextAreaElement | null>(null);

  const attachToTextArea = (textarea: HTMLTextAreaElement) => {
    setActiveField(textarea);
  };

  const close = () => setActiveField(null);

  return { activeField, attachToTextArea, close };
};
