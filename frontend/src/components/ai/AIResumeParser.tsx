import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiService, ResumeParseResult } from '@/services/ai.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, CheckCircle, Loader2, X, Brain } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AIResumeParserProps {
  onParsed: (data: ResumeParseResult) => void;
  className?: string;
}

export const AIResumeParser: React.FC<AIResumeParserProps> = ({ onParsed, className }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseMutation = useMutation({
    mutationFn: (f: File) => aiService.parseResume(f),
    onSuccess: (res) => {
      onParsed(res.data);
      setFile(null);
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.doc'))) {
      setFile(f);
    }
  };

  return (
    <Card padding="md" className={cn('relative overflow-hidden', className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-neutral-900 dark:text-white text-sm">AI Resume Parser</p>
          <p className="text-xs text-neutral-400">Upload a resume to auto-fill candidate details</p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
          dragOver ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/5' : 'border-neutral-200 dark:border-neutral-700 hover:border-brand-300'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
        />
        {parseMutation.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm text-neutral-500">Parsing resume...</p>
          </div>
        ) : file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-6 h-6 text-brand-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{file.name}</span>
             <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1 rounded-full hover:bg-neutral-100">
              <X size={14} className="text-neutral-400" />
            </Button>
            <Button size="sm" onClick={(e) => { e.stopPropagation(); parseMutation.mutate(file); }} className="gap-2">
              <Upload size={14} /> Parse
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-neutral-300" />
            <p className="text-sm text-neutral-500">Drop resume here or click to browse</p>
            <p className="text-xs text-neutral-400">Supports PDF, DOC, DOCX</p>
          </div>
        )}
      </div>

      {parseMutation.isSuccess && (
        <div className="mt-3 p-3 rounded-xl bg-success-50 dark:bg-success-900/10 flex items-center gap-2 text-sm text-success-700 dark:text-success-400">
          <CheckCircle size={16} /> Resume parsed successfully — candidate form is populated
        </div>
      )}
      {parseMutation.isError && (
        <div className="mt-3 p-3 rounded-xl bg-error-50 dark:bg-error-900/10 flex items-center gap-2 text-sm text-error-600">
          <X size={16} /> Failed to parse resume. Try again.
        </div>
      )}
    </Card>
  );
};
