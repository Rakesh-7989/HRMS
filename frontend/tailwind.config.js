/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Brand Colors - Deep Indigo to Vibrant Teal (Keka-inspired)
                brand: {
                    50: '#f0f4ff',
                    100: '#e0e9ff',
                    200: '#c7d6ff',
                    300: '#a5bbff',
                    400: '#7c92ff',
                    500: '#5a6bff',     // Primary brand
                    600: '#4353e8',     // Primary hover
                    700: '#3540c2',     // Primary active
                    800: '#2d359e',
                    900: '#262d7f',
                    950: '#1a1c4d',
                },

                // Teal Accent (Keka's signature)
                teal: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6',     // Accent primary
                    600: '#0d9488',
                    700: '#0f766e',
                    800: '#115e59',
                    900: '#134e4a',
                    950: '#042f2e',
                },

                // Coral Accent (Warm, human)
                coral: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',     // Accent primary
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },

                // Success (Green)
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },

                // Warning (Amber)
                warning: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },

                // Error (Red)
                error: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                },

                // Neutral / Gray Scale (Modern, warm grays)
                neutral: {
                    0: '#ffffff',
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                },

                // Semantic colors using CSS variables for dark/light mode switching
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                card: 'var(--card)',
                'card-foreground': 'var(--card-foreground)',
                border: 'var(--border)',
                input: 'var(--input)',
                ring: 'var(--ring)',
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)',
                    hover: 'var(--primary-hover)',
                    light: 'var(--primary-light)',
                },
                secondary: {
                    DEFAULT: 'var(--secondary)',
                    foreground: 'var(--secondary-foreground)',
                },
                muted: {
                    DEFAULT: 'var(--muted)',
                    foreground: 'var(--muted-foreground)',
                },
                accent: {
                    DEFAULT: 'var(--accent)',
                    foreground: 'var(--accent-foreground)',
                },
                destructive: {
                    DEFAULT: 'var(--destructive)',
                    foreground: 'var(--destructive-foreground)',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
                display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0' }],
                sm: ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }],
                base: ['1rem', { lineHeight: '1.5', letterSpacing: '0' }],
                lg: ['1.125rem', { lineHeight: '1.5', letterSpacing: '0' }],
                xl: ['1.25rem', { lineHeight: '1.5', letterSpacing: '0' }],
                '2xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
                '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
                '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
                '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
                '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
                '7xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
                '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
                '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
            },
            fontWeight: {
                thin: '100',
                extralight: '200',
                light: '300',
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700',
                extrabold: '800',
                black: '900',
            },
            lineHeight: {
                none: '1',
                tight: '1.1',
                snug: '1.375',
                normal: '1.5',
                relaxed: '1.625',
                loose: '2',
            },
            letterSpacing: {
                tighter: '-0.05em',
                tight: '-0.025em',
                normal: '0',
                wide: '0.025em',
                wider: '0.05em',
                widest: '0.1em',
            },
            spacing: {
                0: '0',
                1: '0.25rem',
                2: '0.5rem',
                3: '0.75rem',
                4: '1rem',
                5: '1.25rem',
                6: '1.5rem',
                7: '1.75rem',
                8: '2rem',
                9: '2.25rem',
                10: '2.5rem',
                11: '2.75rem',
                12: '3rem',
                14: '3.5rem',
                16: '4rem',
                20: '5rem',
                24: '6rem',
                28: '7rem',
                32: '8rem',
                36: '9rem',
                40: '10rem',
                44: '11rem',
                48: '12rem',
                52: '13rem',
                56: '14rem',
                60: '15rem',
                64: '16rem',
                72: '18rem',
                80: '20rem',
                96: '24rem',
            },
            borderRadius: {
                none: '0',
                sm: '0.25rem',
                base: '0.375rem',
                md: '0.5rem',
                lg: '0.75rem',
                xl: '1rem',
                '2xl': '1.25rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
                full: '9999px',
            },
            boxShadow: {
                // Elevation shadows
                'elev-1': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'elev-2': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'elev-3': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'elev-4': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'elev-5': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                'elev-6': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

                // Colored shadows
                'brand': '0 10px 40px -10px rgb(67 83 232 / 0.4)',
                'brand-hover': '0 20px 60px -15px rgb(67 83 232 / 0.5)',
                'teal': '0 10px 40px -10px rgb(20 184 166 / 0.4)',
                'coral': '0 10px 40px -10px rgb(249 115 22 / 0.4)',
                'success': '0 10px 40px -10px rgb(34 197 94 / 0.4)',
                'warning': '0 10px 40px -10px rgb(245 158 11 / 0.4)',
                'error': '0 10px 40px -10px rgb(239 68 68 / 0.4)',

                // Inner shadows
                'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'inner-base': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                'inner-lg': 'inset 0 4px 8px 0 rgb(0 0 0 / 0.1)',

                // Focus rings
                'focus-brand': '0 0 0 3px rgb(67 83 232 / 0.4)',
                'focus-teal': '0 0 0 3px rgb(20 184 166 / 0.4)',
                'focus-error': '0 0 0 3px rgb(239 68 68 / 0.4)',
                'focus-success': '0 0 0 3px rgb(34 197 94 / 0.4)',
            },
            transitionDuration: {
                instant: '0ms',
                fast: '150ms',
                normal: '200ms',
                slow: '300ms',
                slower: '500ms',
                slowest: '700ms',
            },
            transitionTimingFunction: {
                linear: 'linear',
                'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
                'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
                'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
                spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
                bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },
            zIndex: {
                hide: '-1',
                base: '0',
                dropdown: '1000',
                sticky: '1100',
                overlay: '1200',
                modal: '1300',
                popover: '1400',
                tooltip: '1500',
                toast: '1600',
                commandPalette: '1700',
            },
            screens: {
                xs: '320px',
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
                '3xl': '1920px',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'slide-left': 'slideLeft 0.3s ease-out',
                'slide-right': 'slideRight 0.3s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'gradient': 'gradient 8s ease infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'text-reveal': 'textReveal 0.8s ease-out forwards',
                'typewriter': 'typewriter 2s steps(40) forwards',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'fade-in-stagger': 'fadeInStagger 0.5s ease-out forwards',
                'slide-in-blur': 'slideInBlur 0.5s ease-out forwards',
                'scale-fade': 'scaleFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideLeft: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideRight: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                textReveal: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                typewriter: {
                    '0%': { width: '0' },
                    '100%': { width: '100%' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInStagger: {
                    '0%': { opacity: '0', transform: 'translateY(15px) scale(0.95)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                slideInBlur: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)', filter: 'blur(10px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)', filter: 'blur(0)' },
                },
                scaleFade: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            addUtilities({
                // Glass effect utilities
                '.glass-effect': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                },
                '.dark .glass-effect': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                },

                // Semantic color utilities using CSS variables
                '.bg-bg-primary': { backgroundColor: 'var(--background)' },
                '.bg-bg-secondary': { backgroundColor: 'var(--bg-secondary)' },
                '.bg-bg-tertiary': { backgroundColor: 'var(--bg-tertiary)' },
                '.bg-card': { backgroundColor: 'var(--card)' },
                '.border-border': { borderColor: 'var(--border)' },
                '.text-fg-primary': { color: 'var(--foreground)' },
                '.text-fg-secondary': { color: 'var(--text-secondary)' },
                '.text-fg-tertiary': { color: 'var(--text-tertiary)' },

                // Gradient utilities
                '.bg-gradient-radial': {
                    background: 'radial-gradient(circle at center, rgba(71, 82, 90, 0.08) 0%, transparent 70%)',
                },
                '.bg-gradient-premium': {
                    background: 'linear-gradient(135deg, #47525A 0%, #BABCC2 50%, #E3E8F0 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient 8s ease infinite',
                },
                '.bg-primary-gradient': {
                    background: 'var(--primary-gradient)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient 8s ease infinite',
                },

                // Light gradient tints
                '.bg-primary-10': {
                    backgroundImage: 'linear-gradient(90deg, rgba(66, 39, 90, 0.08), rgba(115, 75, 109, 0.08))',
                },
                '.bg-primary-20': {
                    backgroundImage: 'linear-gradient(90deg, rgba(66, 39, 90, 0.16), rgba(115, 75, 109, 0.16))',
                },
                '.border-primary-gradient': {
                    borderImageSource: 'var(--primary-gradient)',
                    borderImageSlice: '1',
                },

                // Text gradients
                '.hover\\:bg-primary-gradient:hover': {
                    background: 'var(--primary-gradient)',
                    backgroundSize: '200% 200%',
                },
                '.text-primary-gradient': {
                    background: 'var(--primary-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                },
                '.text-gradient': {
                    background: 'linear-gradient(135deg, #47525A 0%, #BABCC2 50%, #E3E8F0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                },

                // Animation utilities
                '.animate-float': { animation: 'float 6s ease-in-out infinite' },
                '.text-reveal': { animation: 'textReveal 0.8s ease-out forwards', opacity: '0' },
                '.text-fade-in-up': { animation: 'fadeInUp 0.6s ease-out forwards', opacity: '0' },

                // Stagger animations
                '.text-stagger > *': { animation: 'fadeInStagger 0.5s ease-out forwards', opacity: '0' },
                '.text-stagger > *:nth-child(1)': { animationDelay: '0.1s' },
                '.text-stagger > *:nth-child(2)': { animationDelay: '0.2s' },
                '.text-stagger > *:nth-child(3)': { animationDelay: '0.3s' },
                '.text-stagger > *:nth-child(4)': { animationDelay: '0.4s' },
                '.text-stagger > *:nth-child(5)': { animationDelay: '0.5s' },

                // Smooth transitions
                '.transition-elegant': { transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' },
                '.transition-smooth': { transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' },

                // Form select utility
                '.form-select': {
                    appearance: 'none',
                    padding: '0.5rem 2.25rem 0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    borderWidth: '1px',
                    borderColor: 'rgb(209 213 219)',
                    backgroundColor: 'white',
                    color: 'rgb(17 24 39)',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239c9e9f' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1em',
                },
                '.dark .form-select': {
                    borderColor: 'rgb(55 65 81)',
                    backgroundColor: 'rgb(17 24 39)',
                    color: 'white',
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23E5E7EB' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                },

                // Hover effects
                '.animate-fadeIn': { animation: 'fadeIn 0.2s ease-out' },
                '.btn-base:disabled': {
                    opacity: '0.5',
                    cursor: 'not-allowed',
                    transform: 'none !important',
                },

                // Input base
                '.input-base': {
                    width: '100%',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                },
                '.input-base::placeholder': { color: 'var(--text-disabled)' },
                '.input-base:hover': { borderColor: 'var(--border-secondary)' },
                '.input-base:focus': {
                    borderColor: 'var(--border-focus)',
                    boxShadow: 'var(--focus-brand)',
                },
                '.input-base:disabled': {
                    opacity: '0.5',
                    cursor: 'not-allowed',
                    backgroundColor: 'var(--bg-tertiary)',
                },

                // Badge base
                '.badge-base': {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                },

                // Scrollbar styling
                '.custom-scrollbar::-webkit-scrollbar': { width: '4px', height: '4px' },
                '.custom-scrollbar::-webkit-scrollbar-track': { background: 'transparent' },
                '.custom-scrollbar::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(66, 39, 90, 0.1)',
                    borderRadius: '9999px',
                },
                '.dark .custom-scrollbar::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '.custom-scrollbar::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: 'rgba(66, 39, 90, 0.3)',
                },
            });
        },
    ],
};