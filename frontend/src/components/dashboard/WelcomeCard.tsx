import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Clock, Sparkles, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { getGreeting } from '@/utils/timeFormat';

interface WelcomeCardProps {
    className?: string;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ className }) => {
    const { user } = useAuth();
    const date = new Date();
    const greeting = getGreeting(user?.timezone);

    const getRoleMessage = () => {
        switch (user?.role) {
            case 'SUPER_ADMIN': return 'Monitor system-wide analytics and tenant management';
            case 'ADMIN': return 'Oversee organization metrics and team performance';
            case 'HR': return 'Manage employee records, attendance, and leave requests';
            case 'MANAGER': return 'Track your team\'s progress and pending approvals';
            default: return 'View your attendance, leaves, and tasks';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            <div className={cn(
                "relative overflow-hidden rounded-2xl",
                "bg-white dark:bg-neutral-900",
                "border border-neutral-200 dark:border-neutral-700",
                "shadow-elev-1"
            )}>
                {/* Decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-teal-500/5 to-transparent dark:from-brand-500/10 dark:via-teal-500/5 dark:to-transparent" />

                {/* Animated decorative blob */}
                <motion.div
                    className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-20"
                    style={{ background: 'linear-gradient(135deg, #5a6bff 0%, #14b8a6 100%)' }}
                    animate={{ x: [0, 30, 0], y: [0, -15, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                    <div className="flex items-center gap-4">
                        <motion.div
                            className="hidden sm:block h-12 w-1.5 rounded-full bg-gradient-to-b from-brand-500 via-teal-500 to-brand-600"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        />

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                >
                                    <Sparkles size={16} className="text-brand-500" />
                                </motion.span>
                                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    {greeting}
                                </span>
                            </div>

                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                                Welcome back,{' '}
                                <span className="bg-gradient-to-r from-brand-600 to-teal-600 dark:from-brand-400 dark:to-teal-400 bg-clip-text text-transparent">
                                    {user?.first_name || 'User'}
                                </span>
                            </h1>

                            <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block"
                            >
                                {getRoleMessage()}
                            </motion.p>
                        </div>
                    </div>

                    {/* Date/Time display */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-3"
                    >
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-2.5",
                            "bg-white/80 dark:bg-neutral-800/60",
                            "rounded-xl border border-neutral-200 dark:border-neutral-700/50",
                            "shadow-elev-1 backdrop-blur-sm"
                        )}>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-brand-500 dark:text-brand-400" />
                                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                    {format(date, 'EEEE, MMM dd')}
                                </p>
                            </div>

                            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-600" />

                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-neutral-400 dark:text-neutral-500" />
                                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                                    {format(date, 'yyyy')}
                                </p>
                            </div>

                            <motion.div
                                className="h-2 w-2 rounded-full bg-brand-500"
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                style={{ boxShadow: '0 0 8px rgba(90, 107, 255, 0.5)' }}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
