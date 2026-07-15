/**
 * HRMS Design System Tokens - Keka-level Quality
 * Single source of truth for all design decisions
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
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

  // Semantic Colors (Light Mode)
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f4f4f5',
      inverse: '#18181b',
    },
    text: {
      primary: '#18181b',
      secondary: '#3f3f46',
      tertiary: '#71717a',
      inverse: '#ffffff',
      disabled: '#a1a1aa',
      link: '#4353e8',
    },
    border: {
      primary: '#e4e4e7',
      secondary: '#d4d4d8',
      focus: '#4353e8',
      error: '#ef4444',
      success: '#22c55e',
    },
    card: {
      bg: '#ffffff',
      border: '#e4e4e7',
      hover: '#fafafa',
    },
    surface: {
      raised: '#ffffff',
      overlay: 'rgba(24, 24, 27, 0.5)',
    },
  },

  // Semantic Colors (Dark Mode)
  dark: {
    bg: {
      primary: '#09090b',
      secondary: '#18181b',
      tertiary: '#27272a',
      inverse: '#ffffff',
    },
    text: {
      primary: '#fafafa',
      secondary: '#e4e4e7',
      tertiary: '#a1a1aa',
      inverse: '#18181b',
      disabled: '#52525b',
      link: '#a5bbff',
    },
    border: {
      primary: '#3f3f46',
      secondary: '#52525b',
      focus: '#7c92ff',
      error: '#f87171',
      success: '#4ade80',
    },
    card: {
      bg: '#18181b',
      border: '#3f3f46',
      hover: '#27272a',
    },
    surface: {
      raised: '#18181b',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamilies: {
    sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
    display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  },

  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    '8xl': '6rem',    // 96px
    '9xl': '8rem',    // 128px
  },

  fontWeights: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeights: {
    none: 1,
    tight: 1.1,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacings: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Heading Styles
  headings: {
    h1: { fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },   // 72px
    h2: { fontSize: '3.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },   // 60px
    h3: { fontSize: '3rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },      // 48px
    h4: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },   // 36px
    h5: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '0' },        // 30px
    h6: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '0' },          // 24px
  },

  // Body Styles
  body: {
    large: { fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.6 },   // 18px
    base: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },         // 16px
    small: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },    // 14px
    xs: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5 },        // 12px
  },

  // Label Styles
  label: {
    large: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },    // 14px
    base: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },     // 14px
    small: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.5 },     // 12px
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  7: '1.75rem',   // 28px
  8: '2rem',      // 32px
  9: '2.25rem',   // 36px
  10: '2.5rem',   // 40px
  11: '2.75rem',  // 44px
  12: '3rem',     // 48px
  14: '3.5rem',   // 56px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  28: '7rem',     // 112px
  32: '8rem',     // 128px
  36: '9rem',     // 144px
  40: '10rem',    // 160px
  44: '11rem',    // 176px
  48: '12rem',    // 192px
  52: '13rem',    // 208px
  56: '14rem',    // 224px
  60: '15rem',    // 240px
  64: '16rem',    // 256px
  72: '18rem',    // 288px
  80: '20rem',    // 320px
  96: '24rem',    // 384px
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  '4xl': '2rem',    // 32px
  full: '9999px',
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  // Elevation shadows (Material-inspired)
  elevation: {
    1: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    2: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    3: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    4: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    5: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    6: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Colored shadows (brand-aware)
  colored: {
    brand: '0 10px 40px -10px rgb(67 83 232 / 0.4)',
    brandHover: '0 20px 60px -15px rgb(67 83 232 / 0.5)',
    teal: '0 10px 40px -10px rgb(20 184 166 / 0.4)',
    coral: '0 10px 40px -10px rgb(249 115 22 / 0.4)',
    success: '0 10px 40px -10px rgb(34 197 94 / 0.4)',
    warning: '0 10px 40px -10px rgb(245 158 11 / 0.4)',
    error: '0 10px 40px -10px rgb(239 68 68 / 0.4)',
  },

  // Inner shadows
  inner: {
    sm: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    lg: 'inset 0 4px 8px 0 rgb(0 0 0 / 0.1)',
  },

  // Focus rings
  focus: {
    brand: '0 0 0 3px rgb(67 83 232 / 0.4)',
    teal: '0 0 0 3px rgb(20 184 166 / 0.4)',
    error: '0 0 0 3px rgb(239 68 68 / 0.4)',
    success: '0 0 0 3px rgb(34 197 94 / 0.4)',
  },
} as const;

// ============================================
// TRANSITIONS & ANIMATIONS
// ============================================

export const transitions = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
  },

  easings: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Common transition combinations
  presets: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '300ms cubic-bezier(0.16, 1, 0.3, 1)',
    bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
  commandPalette: 1700,
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// ============================================
// COMPONENT SIZES
// ============================================

export const componentSizes = {
  button: {
    sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.875rem', gap: '0.375rem' },     // 32px
    md: { height: '2.5rem', padding: '0 1rem', fontSize: '0.875rem', gap: '0.5rem' },         // 40px
    lg: { height: '3rem', padding: '0 1.5rem', fontSize: '1rem', gap: '0.5rem' },             // 48px
    xl: { height: '3.5rem', padding: '0 2rem', fontSize: '1.125rem', gap: '0.75rem' },        // 56px
  },
  input: {
    sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.875rem' },
    md: { height: '2.5rem', padding: '0 1rem', fontSize: '0.875rem' },
    lg: { height: '3rem', padding: '0 1rem', fontSize: '1rem' },
  },
  card: {
    sm: { padding: '1rem' },
    md: { padding: '1.5rem' },
    lg: { padding: '2rem' },
  },
} as const;

// ============================================
// ICON SIZES
// ============================================

export const iconSizes = {
  xs: '0.75rem',    // 12px
  sm: '1rem',       // 16px
  md: '1.25rem',    // 20px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '2.5rem',  // 40px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
} as const;

// ============================================
// LAYOUT CONSTANTS
// ============================================

export const layout = {
  headerHeight: '4rem',           // 64px
  sidebarWidth: '16rem',          // 256px
  sidebarCollapsedWidth: '5rem',  // 80px
  sidebarMobileWidth: '18rem',    // 288px
  maxContentWidth: '80rem',       // 1280px
  containerPadding: '1.5rem',     // 24px
} as const;

// ============================================
// EXPORT ALL TOKENS
// ============================================

export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  componentSizes,
  iconSizes,
  layout,
} as const;

export type DesignTokens = typeof designTokens;