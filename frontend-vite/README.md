# Survey Generator - React (Vite) SPA

This is the migrated React Single Page Application (SPA) using Vite as the build tool, converted from the original Next.js application with App Router.

## 🚀 Project Overview

The Survey Generator is a comprehensive web application for creating and managing surveys with a drag-and-drop interface, real-time progress tracking, and seamless backend integration.

### Key Features

- **Multi-step Survey Workflow**: Project setup → Research configuration → Survey generation → Survey builder
- **Real-time Updates**: WebSocket integration for live progress tracking
- **Drag-and-Drop Survey Builder**: Intuitive interface for creating surveys
- **JWT Authentication**: Secure user authentication and session management
- **File Operations**: Upload and download survey documents
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## 🛠️ Technology Stack

- **Build Tool**: Vite 8.x
- **Framework**: React 19.x
- **Language**: TypeScript 6.x (Strict Mode)
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand 5.x
- **Routing**: React Router 6.x
- **HTTP Client**: Axios
- **WebSocket**: Native WebSocket API
- **Icons**: Heroicons
- **UI Components**: Headless UI

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements (Button, Input, etc.)
│   ├── forms/          # Form-specific components
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   └── survey/         # Survey-specific components
├── pages/              # Page components
├── services/           # External service integrations
│   ├── api/            # API client and endpoints
│   ├── websocket/      # WebSocket service
│   ├── auth/           # Authentication service
│   └── storage/        # Local storage utilities
├── stores/             # Zustand state stores
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # Application constants
└── assets/             # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:8000`

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd frontend-vite
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.development
   ```
   
   Update the environment variables as needed:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_WS_BASE_URL=ws://localhost:8000
   ```

### Development

1. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`

2. **Type checking**:
   ```bash
   npm run type-check
   ```

3. **Linting**:
   ```bash
   npm run lint
   npm run lint:fix
   ```

### Building for Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Preview the production build**:
   ```bash
   npm run preview
   ```

## 🔧 Configuration

### Vite Configuration

The Vite configuration includes:
- **Path Aliases**: `@/*` maps to `src/*`
- **Code Splitting**: Automatic chunking for vendor, router, and state libraries
- **Build Optimization**: ESBuild minification and source maps
- **Development Server**: Hot Module Replacement (HMR) on port 3000

### TypeScript Configuration

- **Strict Mode**: Enabled for maximum type safety
- **Path Mapping**: Configured for `@/*` imports
- **Modern Target**: ES2023 with DOM libraries
- **Bundler Mode**: Optimized for Vite bundling

### Tailwind CSS

- **Custom Theme**: Extended with primary color palette
- **Component Classes**: Pre-defined button and form styles
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Ready for implementation

## 🏗️ Architecture

### State Management

The application uses Zustand for state management with the following stores:
- **Auth Store**: User authentication and session management
- **Survey Store**: Survey workflow and generation state
- **UI Store**: Global UI state (loading, notifications, modals)
- **WebSocket Store**: Real-time connection state

### Service Layer

- **HTTP Service**: Axios-based API client with interceptors
- **WebSocket Service**: Real-time communication with reconnection logic
- **Auth Service**: JWT token management and validation
- **Storage Service**: Local storage abstraction

### Component Architecture

- **Atomic Design**: Components organized by complexity and reusability
- **TypeScript**: Fully typed props and interfaces
- **Composition**: Favor composition over inheritance
- **Performance**: React.memo and lazy loading where appropriate

## 🔌 API Integration

The application integrates with the existing FastAPI backend:

### Authentication Endpoints
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration

### Survey Endpoints
- `POST /api/v1/surveys/business-overview` - Generate business overview
- `POST /api/v1/surveys/research-objectives` - Generate research objectives
- `POST /api/v1/surveys/generate` - Start survey generation
- `GET /api/v1/surveys/status/{requestId}` - Get generation status

### WebSocket Endpoints
- `ws://localhost:8000/ws/survey/{requestId}` - Real-time progress updates

## 🧪 Testing Strategy

The project will implement comprehensive testing:

### Unit Tests
- Component testing with React Testing Library
- Service layer testing with mocked dependencies
- Utility function testing

### Property-Based Tests
- Universal property validation across inputs
- State management consistency testing
- API compatibility verification

### Integration Tests
- Complete workflow testing
- Authentication flow validation
- WebSocket integration testing

### End-to-End Tests
- Critical user journey validation
- Cross-browser compatibility
- Performance testing

## 📦 Build Output

The production build generates:
- **Optimized Bundles**: Separate chunks for vendor, router, and application code
- **Source Maps**: For debugging in production
- **Static Assets**: Optimized images and fonts
- **Gzip Compression**: Reduced bundle sizes

### Bundle Analysis

- **Vendor Chunk**: React, React DOM (~191KB gzipped: ~61KB)
- **Router Chunk**: React Router DOM
- **State Chunk**: Zustand
- **App Chunk**: Application code (~3KB gzipped: ~1.2KB)

## 🚀 Deployment

### Environment Setup

1. **Production Environment Variables**:
   ```env
   VITE_API_BASE_URL=https://your-api-domain.com
   VITE_WS_BASE_URL=wss://your-api-domain.com
   VITE_NODE_ENV=production
   ```

2. **Build for Production**:
   ```bash
   npm run build
   ```

3. **Serve Static Files**:
   The `dist/` directory contains all static files ready for deployment.

### Deployment Options

- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: CloudFront, CloudFlare
- **Container**: Docker with nginx
- **Traditional Hosting**: Apache, nginx

## 🔍 Monitoring and Debugging

### Development Tools

- **React DevTools**: Component inspection and profiling
- **Zustand DevTools**: State management debugging
- **Vite DevTools**: Build analysis and HMR debugging

### Production Monitoring

- **Error Tracking**: Ready for Sentry integration
- **Performance Monitoring**: Web Vitals tracking
- **Analytics**: Ready for Google Analytics integration

## 🤝 Contributing

### Development Workflow

1. **Code Quality**: ESLint and Prettier configured
2. **Type Safety**: Strict TypeScript configuration
3. **Git Hooks**: Husky for pre-commit validation
4. **Testing**: Comprehensive test coverage required

### Code Standards

- **Naming Conventions**: PascalCase for components, camelCase for functions
- **File Organization**: Feature-based directory structure
- **Import Order**: External libraries, internal modules, relative imports
- **Component Props**: Fully typed with TypeScript interfaces

## 📚 Documentation

- **Component Documentation**: Storybook integration planned
- **API Documentation**: OpenAPI/Swagger integration
- **Type Documentation**: Generated from TypeScript interfaces
- **Architecture Decision Records**: Documented design decisions

## 🔄 Migration Status

### ✅ Completed
- [x] Vite project initialization with React and TypeScript
- [x] TypeScript strict mode configuration
- [x] Tailwind CSS integration
- [x] Project structure setup
- [x] Path aliases configuration
- [x] Build system optimization
- [x] Development server setup

### 🚧 In Progress
- [ ] Component library implementation
- [ ] Service layer development
- [ ] State management setup
- [ ] Authentication system
- [ ] Survey workflow pages

### 📋 Planned
- [ ] WebSocket integration
- [ ] Survey builder implementation
- [ ] Testing framework setup
- [ ] Performance optimization
- [ ] Production deployment

## 📞 Support

For questions or issues:
1. Check the existing documentation
2. Review the TypeScript types for API contracts
3. Consult the design document for architecture decisions
4. Create an issue with detailed reproduction steps

---

**Next Steps**: The foundation is ready for implementing the survey workflow, authentication system, and component library as outlined in the design document.