# Tailwind CSS Configuration

## Overview

Tailwind CSS has been successfully configured and integrated with the Vite React application. The configuration is optimized for the survey builder application with custom components, utilities, and design tokens.

## Configuration Files

### 1. `tailwind.config.js`
- **Content paths**: Configured to scan `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`
- **Custom colors**: Extended color palette with primary, success, warning, and error variants
- **Typography**: Inter font family configured as default
- **Animations**: Custom animations for fade-in, slide-up, and slow pulse effects
- **Shadows**: Custom soft and medium shadow variants
- **Spacing**: Additional spacing utilities (18, 88)

### 2. `postcss.config.js`
- Configured with Tailwind CSS and Autoprefixer plugins
- Ensures cross-browser compatibility for CSS properties

### 3. `src/index.css`
- Tailwind directives imported (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Custom component classes for consistent UI elements
- Survey builder specific styles
- Accessibility-focused styles

## Custom Component Classes

### Button Components
- `.btn` - Base button styles with focus states
- `.btn-{size}` - Size variants (sm, md, lg)
- `.btn-{variant}` - Color variants (primary, secondary, outline, ghost, success, warning, error)

### Form Components
- `.form-input` - Styled input fields with focus states
- `.form-input-error` - Error state styling
- `.form-label` - Consistent label styling
- `.form-error` - Error message styling
- `.form-helper` - Helper text styling

### Card Components
- `.card` - Base card container
- `.card-header` - Card header section
- `.card-body` - Card content area
- `.card-footer` - Card footer section

### Survey Builder Specific
- `.survey-canvas` - Drag-and-drop canvas area
- `.survey-canvas-active` - Active state for canvas
- `.question-item` - Individual question styling
- `.question-item-selected` - Selected question state
- `.draggable-item` - Draggable element styling
- `.drop-zone` - Drop zone styling
- `.drop-zone-active` - Active drop zone state

### Notification Components
- `.notification` - Base notification styling
- `.notification-{type}` - Type variants (success, warning, error, info)

### Utility Classes
- `.loading-spinner` - Animated loading spinner
- `.text-balance` - Text wrapping utility
- `.scrollbar-thin` - Custom thin scrollbar styling

## Color Palette

### Primary Colors (Blue)
- 50: `#eff6ff` (lightest)
- 500: `#3b82f6` (main)
- 900: `#1e3a8a` (darkest)

### Success Colors (Green)
- 50: `#f0fdf4` (lightest)
- 500: `#22c55e` (main)
- 900: `#14532d` (darkest)

### Warning Colors (Yellow)
- 50: `#fffbeb` (lightest)
- 500: `#f59e0b` (main)
- 900: `#78350f` (darkest)

### Error Colors (Red)
- 50: `#fef2f2` (lightest)
- 500: `#ef4444` (main)
- 900: `#7f1d1d` (darkest)

## Custom Animations

### Fade In
```css
@keyframes fadeIn {
  0% { opacity: 0 }
  100% { opacity: 1 }
}
```
Usage: `animate-fade-in`

### Slide Up
```css
@keyframes slideUp {
  0% { transform: translateY(10px); opacity: 0 }
  100% { transform: translateY(0); opacity: 1 }
}
```
Usage: `animate-slide-up`

### Slow Pulse
```css
animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite
```
Usage: `animate-pulse-slow`

## Production Optimization

- **Purging**: Tailwind automatically removes unused CSS in production builds
- **Minification**: CSS is minified and optimized by Vite
- **Gzip compression**: Build output shows gzipped sizes for performance monitoring
- **Tree shaking**: Only used Tailwind utilities are included in the final bundle

## Development Experience

- **Hot Module Replacement**: Tailwind changes are reflected immediately during development
- **IntelliSense**: VS Code Tailwind CSS IntelliSense extension provides autocomplete
- **Class sorting**: Prettier plugin can be added for consistent class ordering
- **Linting**: Can be extended with Tailwind-specific ESLint rules

## Integration with Vite

- **Fast builds**: Tailwind CSS processes quickly with Vite's build system
- **Development server**: Instant updates during development
- **Code splitting**: Tailwind CSS is properly handled in Vite's code splitting
- **Asset optimization**: CSS is optimized and cached appropriately

## Next Steps

The Tailwind CSS configuration is ready for:
1. Component library implementation
2. Survey builder UI components
3. Form components with validation states
4. Authentication pages
5. Responsive design implementation
6. Dark mode support (can be added later)

## Verification

The configuration has been tested and verified:
- ✅ Build process completes successfully
- ✅ TypeScript compilation passes
- ✅ Custom classes are properly generated
- ✅ Animations and utilities work correctly
- ✅ Production build optimization is working
- ✅ Development server hot reloading functions properly