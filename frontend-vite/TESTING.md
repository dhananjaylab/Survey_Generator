# Testing Framework Documentation

This document describes the comprehensive testing framework setup for the Next.js to React (Vite) migration project.

## Testing Stack

### 1. Unit Testing - Vitest + React Testing Library

**Purpose**: Test individual components, functions, and modules in isolation.

**Technologies**:
- **Vitest**: Fast unit test runner with native ES modules support
- **React Testing Library**: Testing utilities for React components
- **jsdom**: DOM environment for testing
- **@testing-library/jest-dom**: Custom matchers for DOM assertions

**Configuration**: `vitest.config.ts`

**Test Location**: `src/**/__tests__/*.test.{ts,tsx}`

**Commands**:
```bash
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

### 2. Property-Based Testing - fast-check

**Purpose**: Verify universal properties across all possible inputs using generated test data.

**Technology**: **fast-check** - Property-based testing library

**Configuration**: `src/test/property-tests/setup.ts`

**Test Location**: `src/test/property-tests/*.property.test.ts`

**Commands**:
```bash
npm run test:property # Run property-based tests only
```

### 3. End-to-End Testing - Playwright

**Purpose**: Test complete user workflows across different browsers.

**Technology**: **Playwright** - Cross-browser automation framework

**Configuration**: `playwright.config.ts`

**Test Location**: `e2e/*.spec.ts`

**Commands**:
```bash
npm run test:e2e        # Run E2E tests headless
npm run test:e2e:ui     # Run E2E tests with UI
npm run test:e2e:headed # Run E2E tests with browser visible
```

## Test Structure

### Unit Tests

```typescript
// Example: src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@/test/utils'
import { Button } from '../Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Property-Based Tests

```typescript
// Example: src/test/property-tests/auth.property.test.ts
import fc from 'fast-check'
import { arbitraries, createPropertyTest } from './setup'

describe('Authentication Properties', () => {
  /**
   * Feature: nextjs-to-react-migration, Property 9: Authentication State Management
   * Validates: Requirements 2.6, 5.2, 12.3
   */
  it('maintains authentication state consistency', () => {
    createPropertyTest(
      fc.property(
        arbitraries.jwtToken(),
        fc.string({ minLength: 3 }),
        (tokens, username) => {
          // Property test logic here
          expect(/* assertions */).toBeTruthy()
        }
      )
    )
  })
})
```

### End-to-End Tests

```typescript
// Example: e2e/survey-workflow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Survey Generation Workflow', () => {
  test('completes full survey creation', async ({ page }) => {
    await page.goto('/')
    
    // Test complete user workflow
    await page.click('[data-testid="create-survey"]')
    await page.fill('[data-testid="project-name"]', 'Test Project')
    // ... more steps
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })
})
```

## Test Utilities

### Custom Render Function

Located in `src/test/utils.tsx`, provides a custom render function with necessary providers:

```typescript
import { render } from '@/test/utils' // Use this instead of @testing-library/react

// Automatically wraps components with:
// - BrowserRouter for routing
// - Future: Auth providers, theme providers, etc.
```

### Property Test Arbitraries

Located in `src/test/property-tests/setup.ts`, provides generators for domain objects:

```typescript
import { arbitraries } from '@/test/property-tests/setup'

// Available arbitraries:
// - arbitraries.projectSetupData()
// - arbitraries.surveyQuestion()
// - arbitraries.jwtToken()
// - arbitraries.user()
// - arbitraries.survey()
// - arbitraries.file()
// And more...
```

## Testing Guidelines

### Unit Testing Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Descriptive Test Names**: Clearly describe what is being tested
3. **Arrange-Act-Assert Pattern**: Structure tests clearly
4. **Mock External Dependencies**: Use vi.mock() for external services
5. **Test Edge Cases**: Include boundary conditions and error states

### Property-Based Testing Best Practices

1. **Define Clear Properties**: Each property should test a universal truth
2. **Use Smart Generators**: Create arbitraries that generate realistic data
3. **Link to Requirements**: Always reference which requirements are being validated
4. **Handle Preconditions**: Use fc.pre() when needed to filter inputs
5. **Shrink Effectively**: Ensure failing examples are minimal

### End-to-End Testing Best Practices

1. **Test Critical User Journeys**: Focus on the most important workflows
2. **Use Data Attributes**: Prefer `data-testid` over CSS selectors
3. **Wait for Elements**: Use proper waiting strategies
4. **Test Across Browsers**: Ensure cross-browser compatibility
5. **Keep Tests Independent**: Each test should be able to run in isolation

## Coverage Requirements

### Unit Tests
- **Components**: 90%+ coverage for all UI components
- **Services**: 95%+ coverage for business logic
- **Utilities**: 100% coverage for pure functions
- **Stores**: 90%+ coverage for state management

### Property Tests
- **Core Properties**: All 28 properties from the design document must be implemented
- **Domain Logic**: Critical business rules must have property tests
- **State Transitions**: State management operations must be property tested

### E2E Tests
- **Happy Paths**: All major user workflows
- **Error Scenarios**: Critical error handling paths
- **Cross-Browser**: Chrome, Firefox, Safari, Edge
- **Mobile**: Responsive design on mobile devices

## Continuous Integration

### Pre-commit Hooks
```bash
# Runs automatically before commits
npm run lint:fix
npm run format
npm run type-check
npm run test:run
```

### CI Pipeline
```bash
# Runs on pull requests and main branch
npm run lint
npm run type-check
npm run test:coverage
npm run test:e2e
npm run build
```

## Debugging Tests

### Unit Tests
```bash
# Debug with VS Code
npm run test:ui  # Visual test runner

# Debug specific test
npx vitest run --reporter=verbose src/path/to/test.test.ts
```

### Property Tests
```bash
# Run with verbose output
npm run test:property -- --reporter=verbose

# Debug failing property with seed
npx vitest run --reporter=verbose src/test/property-tests/failing.test.ts
```

### E2E Tests
```bash
# Debug with browser visible
npm run test:e2e:headed

# Debug with Playwright inspector
npx playwright test --debug

# View test report
npx playwright show-report
```

## Test Data Management

### Fixtures
- Store test data in `src/test/fixtures/`
- Use TypeScript for type safety
- Keep fixtures small and focused

### Mocks
- API mocks in `src/test/mocks/`
- Use MSW for HTTP mocking when needed
- Mock external services consistently

### Factories
- Use factory functions for complex object creation
- Combine with arbitraries for property tests
- Ensure realistic test data

## Performance Testing

### Bundle Analysis
```bash
# Analyze bundle size impact
npm run build
npx vite-bundle-analyzer dist
```

### Load Testing
```bash
# Test application performance
npm run test:e2e -- --grep "performance"
```

## Accessibility Testing

### Automated Testing
```bash
# Run accessibility tests
npm run test:e2e -- --grep "accessibility"
```

### Manual Testing
- Test with screen readers
- Verify keyboard navigation
- Check color contrast
- Validate ARIA attributes

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep testing libraries up to date
2. **Review Coverage**: Ensure coverage remains high
3. **Refactor Tests**: Keep tests maintainable
4. **Update Documentation**: Keep this guide current

### Troubleshooting
- **Flaky Tests**: Use proper waiting strategies
- **Slow Tests**: Optimize test setup and teardown
- **Memory Leaks**: Clean up resources in afterEach
- **CI Failures**: Ensure tests are deterministic

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [fast-check Documentation](https://fast-check.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)