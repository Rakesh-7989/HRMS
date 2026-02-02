import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Clock, Sparkles, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface WelcomeCardProps {
    className?: string;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ className }) => {
    const { user } = useAuth();
    const date = new Date();
    const hour = date.getHours();

    // Dynamic greeting based on time of day
    const getGreeting = () => {
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Get role-specific subtitle
    const getRoleMessage = () => {
        switch (user?.role) {
            case 'SUPER_ADMIN':
                return 'Monitor system-wide analytics and tenant management';
            case 'ADMIN':
                return 'Oversee organization metrics and team performance';
            case 'HR':
                return 'Manage employee records, attendance, and leave requests';
            case 'MANAGER':
                return 'Track your team\'s progress and pending approvals';
            default:
                return 'View your attendance, leaves, and tasks';
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
                "bg-white dark:bg-gray-900/95",
                "border border-gray-100 dark:border-gray-800",
                "text-gray-900 dark:text-white",
                "shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.03]"
            )}>
                {/* Decorative gradient background */}
                <div className="absolute inset-0 dashboard-welcome-gradient opacity-60" />

                {/* Animated decorative elements */}
                <motion.div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
                    style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.3) 100%)',
                    }}
                    animate={{
                        x: [0, 20, 0],
                        y: [0, -10, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                    {/* Left side - Greeting */}
                    <div className="flex items-center gap-4">
                        {/* Colored accent bar */}
                        <motion.div
                            className="hidden sm:block h-12 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"
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
                                    <Sparkles size={16} className="text-amber-500" />
                                </motion.span>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {getGreeting()}
                                </span>
                            </div>

                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                                Welcome back,{' '}
                                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                                    {user?.first_name || 'User'}
                                </span>
                            </h1>

                            <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block"
                            >
                                {getRoleMessage()}
                            </motion.p>
                        </div>
                    </div>

                    {/* Right side - Date/Time display */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-3"
                    >
                        {/* Date Card */}
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-2.5",
                            "bg-white/80 dark:bg-gray-800/60",
                            "rounded-xl border border-gray-100 dark:border-gray-700/50",
                            "shadow-sm backdrop-blur-sm"
                        )}>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-500 dark:text-indigo-400" />
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    {format(date, 'EEEE, MMM dd')}
                                </p>
                            </div>

                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />

                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400 dark:text-gray-500" />
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {format(date, 'yyyy')}
                                </p>
                            </div>

                            {/* Live indicator */}
                            <motion.div
                                className="h-2 w-2 rounded-full bg-emerald-500"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [1, 0.7, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                                }}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
