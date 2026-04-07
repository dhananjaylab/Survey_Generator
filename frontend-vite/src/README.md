# Project Directory Structure

This document describes the directory structure and organization of the React (Vite) SPA project.

## Overview

The project follows a modular, scalable architecture with clear separation of concerns. Each directory has a specific purpose and contains related functionality.

## Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements (Button, Input, Select, etc.)
│   ├── forms/          # Form-specific components
│   ├── layout/         # Layout components (Header, Footer, Sidebar)
│   ├── survey/         # Survey-specific components
│   ├── auth/           # Authentication components
│   └── __tests__/      # Component tests
├── pages/              # Page components (route components)
├── services/           # External service integrations
│   ├── api/            # HTTP API client and endpoints
│   ├── auth/           # Authentication service
│   ├── websocket/      # WebSocket service
│   └── storage/        # Local storage utilities
├── stores/             # Zustand state stores
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and helpers
├── types/              # TypeScript type definitions
├── constants/          # Application constants
├── assets/             # Static assets (images, icons, etc.)
└── test/               # Test utilities and setup
    ├── fixtures/       # Test data fixtures
    ├── mocks/          # Mock implementations
    ├── property-tests/ # Property-based tests
    ├── integration/    # Integration test utilities
    └── e2e/            # End-to-end test utilities
```

## Component Organization

### UI Components (`components/ui/`)
- **Purpose**: Reusable, generic UI components
- **Examples**: Button, Input, Select, Modal, Spinner
- **Guidelines**: 
  - Should be framework-agnostic and reusable
  - Each component in its own directory with index.ts
  - Include TypeScript interfaces for props
  - Follow consistent naming conventions

### Form Components (`components/forms/`)
- **Purpose**: Form-specific components and form handling
- **Examples**: FormField, ProjectSetupForm, ValidationWrapper
- **Guidelines**:
  - Handle form validation and submission
  - Integrate with react-hook-form
  - Provide consistent error handling

### Layout Components (`components/layout/`)
- **Purpose**: Application layout and navigation components
- **Examples**: Layout, Header, Footer, Sidebar, Navigation
- **Guidelines**:
  - Handle responsive design
  - Manage application-wide layout state
  - Provide consistent navigation experience

### Survey Components (`components/survey/`)
- **Purpose**: Survey-specific functionality
- **Examples**: SurveyBuilder, QuestionPalette, SurveyCanvas
- **Guidelines**:
  - Handle drag-and-drop functionality
  - Manage survey state and validation
  - Support all question types

### Authentication Components (`components/auth/`)
- **Purpose**: Authentication and authorization components
- **Examples**: ProtectedRoute, AuthProvider, LoginForm
- **Guidelines**:
  - Handle authentication state
  - Provide route protection
  - Manage user sessions

## Service Layer (`services/`)

### API Service (`services/api/`)
- **Purpose**: HTTP client and API endpoint definitions
- **Files**: httpService.ts, endpoints.ts, errorHandler.ts
- **Responsibilities**:
  - HTTP request/response handling
  - Authentication token management
  - Error handling and retry logic
  - Request/response interceptors

### Authentication Service (`services/auth/`)
- **Purpose**: Authentication and session management
- **Files**: authService.ts
- **Responsibilities**:
  - Login/logout functionality
  - JWT token validation
  - Session persistence
  - Token refresh handling

### WebSocket Service (`services/websocket/`)
- **Purpose**: Real-time communication
- **Files**: websocketService.ts, errorHandler.ts
- **Responsibilities**:
  - WebSocket connection management
  - Message handling and subscription
  - Reconnection logic
  - Connection state tracking

### Storage Service (`services/storage/`)
- **Purpose**: Local data persistence
- **Files**: storageService.ts
- **Responsibilities**:
  - localStorage wrapper
  - Type-safe storage operations
  - Error handling for storage operations

## State Management (`stores/`)

Uses Zustand for global state management with the following stores:

- **authStore.ts**: Authentication state (user, tokens, login status)
- **surveyStore.ts**: Survey workflow state (project data, generation status)
- **uiStore.ts**: UI state (loading, notifications, modals, theme)

### Guidelines:
- Keep stores focused and single-purpose
- Use TypeScript for type safety
- Implement proper state persistence where needed
- Use selectors for derived state

## Type Definitions (`types/`)

Comprehensive TypeScript type definitions organized by domain:

- **auth.ts**: Authentication-related types
- **survey.ts**: Survey and project types
- **api.ts**: API request/response types
- **websocket.ts**: WebSocket message types
- **store.ts**: State management types

### Guidelines:
- Use interfaces for object shapes
- Use union types for enums and constants
- Export types from index.ts for easy importing
- Keep types close to their usage domain

## Utilities (`utils/`)

Helper functions and utilities:

- **helpers.ts**: General-purpose utility functions
- **validation.ts**: Form and data validation functions

### Guidelines:
- Keep functions pure and testable
- Use TypeScript for type safety
- Export from index.ts for easy importing
- Document complex utility functions

## Constants (`constants/`)

Application-wide constants:

- **routes.ts**: Route definitions and paths
- **api.ts**: API endpoints and HTTP status codes
- **ui.ts**: UI-related constants (breakpoints, z-index, etc.)

### Guidelines:
- Use `as const` for immutable constants
- Group related constants together
- Export from index.ts for easy importing

## Path Aliases

The project uses path aliases for clean imports:

```typescript
// Instead of: import { Button } from '../../../components/ui/Button'
// Use: import { Button } from '@/components/ui/Button'
```

Configured in:
- `vite.config.ts`: `'@': path.resolve(__dirname, './src')`
- `tsconfig.app.json`: `"@/*": ["src/*"]`

## Testing Structure (`test/`)

Comprehensive testing setup:

- **setup.ts**: Test environment configuration
- **utils.tsx**: Test utilities and helpers
- **fixtures/**: Test data and mock objects
- **mocks/**: Service and API mocks
- **property-tests/**: Property-based testing setup
- **integration/**: Integration test utilities
- **e2e/**: End-to-end test utilities

## Best Practices

### File Naming
- Components: PascalCase (e.g., `SurveyBuilder.tsx`)
- Utilities: camelCase (e.g., `helpers.ts`)
- Constants: camelCase files, UPPER_SNAKE_CASE exports
- Types: camelCase files, PascalCase interfaces

### Import/Export Patterns
- Use barrel exports (index.ts) for clean imports
- Prefer named exports over default exports
- Use type-only imports when appropriate

### Component Guidelines
- Keep components small and focused
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Follow React hooks best practices

### State Management
- Use local state for component-specific data
- Use Zustand stores for global application state
- Implement proper state normalization
- Use selectors for derived state

This structure provides a solid foundation for a scalable, maintainable React application with clear separation of concerns and consistent organization patterns.