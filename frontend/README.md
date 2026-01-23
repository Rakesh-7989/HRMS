# HRMS Frontend

Modern, production-grade React frontend for the HRMS SaaS application.

## Tech Stack

- **React 18** with **TypeScript**
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query (React Query)** - Powerful data synchronization
- **React Router** - Declarative routing with protected routes
- **Formik + Yup** - Form management and validation
- **Framer Motion** - Production-ready motion library
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client with interceptors

## Features

✨ **Modern UI/UX**
- Dark theme with gold accents
- Animated logo and hover effects
- Responsive design
- Smooth animations and transitions

🔐 **Authentication & Authorization**
- JWT token-based authentication
- Automatic token refresh
- Protected routes with role-based access
- Session management

📊 **Role-Based Dashboards**
- **SUPER_ADMIN** - System-wide analytics
- **ADMIN** - Organization management
- **HR** - Leave and attendance management
- **MANAGER** - Team analytics
- **EMPLOYEE** - Personal dashboard

🎨 **Design System**
- Consistent color palette
- Reusable UI components
- Glass morphism effects
- Custom animations

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5000/api
```

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # Basic UI components
│   │   ├── layout/       # Layout components
│   │   └── dashboard/    # Dashboard-specific components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── pages/           # Page components
│   │   ├── dashboards/  # Role-based dashboards
│   │   └── ...          # Other pages
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json
```

## Color Palette

- **Background**: `#050509` (Dark)
- **Card Background**: `rgba(15, 15, 20, 0.9)`
- **Gold Accent**: `#F5C451`
- **Border**: `rgba(255, 255, 255, 0.1)`
- **Muted Text**: `#9CA3AF`

## Development

### Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode enabled

### Best Practices

- Component-based architecture
- Type-safe API calls
- Error handling
- Loading states
- Responsive design
- Accessibility considerations

