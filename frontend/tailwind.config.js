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
                // Custom HRMS palette (Feldgrau set)
                dark: {
                    bg: '#0F0F14',
                    card: '#1A1A24',
                    border: 'rgba(255, 255, 255, 0.1)',
                },
                // Light mode colors
                light: {
                    bg: '#FFFFFF',
                    card: '#FFFFFF',
                    border: 'rgba(0, 0, 0, 0.08)',
                },
                primary: {
                    DEFAULT: 'var(--primary)',
                    hover: 'var(--primary-hover)',
                    light: 'var(--primary-light)',
                    border: '#BABCC2', // Gray
                    10: 'rgba(14,165,233,0.10)',
                    20: 'rgba(14,165,233,0.20)',
                    50: '#faf7fc',
                    100: '#f2eaf8',
                    200: '#e5d5f1',
                    300: '#c9aee1',
                    400: '#734b6d',
                    500: '#5a3b66',
                    600: '#42275a',
                    700: '#371f4a',
                    800: '#2c1739',
                    900: '#22112b',
                },
                backgroundImage: {
                    'primary-gradient': "linear-gradient(90deg, #42275a 0%, #734b6d 100%)",
                },
                accent: {
                    blue: '#BABCC2',
                    'blue-light': '#E3E8F0',
                    green: '#9c9e9f',
                    'green-light': '#F3F6F9',
                    purple: '#9c9e9f',
                    'purple-light': '#E3E8F0',
                    indigo: '#9c9e9f',
                    teal: '#BABCC2',
                },
                muted: {
                    DEFAULT: '#6B7280',
                    dark: '#4B5563',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
                'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1)',
                'premium': '0 10px 40px rgba(107, 70, 193, 0.12)',
                'premium-lg': '0 20px 60px rgba(107, 70, 193, 0.15)',
                'glow': '0 0 20px rgba(107, 70, 193, 0.25)',
                'glow-lg': '0 0 40px rgba(107, 70, 193, 0.3)',
                'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
                'elegant': '0 4px 20px rgba(0, 0, 0, 0.08)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
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
                '.bg-light-bg': {
                    'background-color': '#FAFAFA',
                },
                '.bg-dark-bg': {
                    'background-color': '#050509',
                },
                '.bg-light-card': {
                    'background-color': '#FFFFFF',
                },
                '.bg-dark-card': {
                    'background-color': 'rgba(15, 15, 20, 0.9)',
                },
                '.border-light-border': {
                    'border-color': 'rgba(0, 0, 0, 0.1)',
                },
                '.border-dark-border': {
                    'border-color': 'rgba(255, 255, 255, 0.1)',
                },
            });
        },
    ],
}

