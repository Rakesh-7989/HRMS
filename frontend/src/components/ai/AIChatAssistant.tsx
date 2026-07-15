import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { aiService, AIChatMessage } from '@/services/ai.service';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export const AIChatAssistant: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { role: 'assistant', content: t('ai.greeting'), timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (msg: string) => aiService.chat(msg, messages),
    onSuccess: (res) => {
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, timestamp: new Date() }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMsg: AIChatMessage = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    chatMutation.mutate(input.trim());
    setInput('');
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-elev-6 border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="text-sm font-bold text-white">{t('ai.chatAssistant')}</span>
            </div>
             <Button variant="ghost" onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
              <X size={16} className="text-white" />
            </Button>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-brand-500" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm',
                  msg.role === 'user'
                    ? 'bg-brand-500 text-white rounded-br-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md'
                )}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-brand-500" />
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <input
                placeholder={t('ai.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
              />
               <Button variant="ghost" 
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                className="p-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all"
              >
                <Send size={16} />
              </Button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
              {t('ai.disclaimer')}
            </p>
          </div>
        </div>
      )}

       <Button variant="ghost" 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 p-3.5 rounded-2xl shadow-elev-6 z-50 transition-all duration-300',
          isOpen
            ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 rotate-90 scale-90'
            : 'bg-gradient-to-r from-brand-500 to-teal-500 text-white hover:scale-105 active:scale-95'
        )}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </Button>
    </>
  );
};
