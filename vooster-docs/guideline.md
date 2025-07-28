# Code Guideline Document: Automated Experience Group System

## 1. Project Overview

This document outlines the coding standards and practices for the Automated Experience Group System, a web-based SaaS platform designed to automate the selection and management of experience group applicants. The system leverages Google Forms for data collection, performs automated SNS influence verification, and dispatches automated emails to selected and unselected applicants.

**Key Architectural Decisions:**
*   **Frontend:** Next.js with Tailwind CSS for optimized loading and responsive UI.
*   **Backend:** Node.js with Express and Prisma ORM for a lightweight REST API server.
*   **Database:** PostgreSQL for main data storage, Redis for caching and job queuing (Bull).
*   **External Integrations:** Google Sheets API, SNS crawling (Puppeteer/Axios), SendGrid (or AWS SES) for email.
*   **Infrastructure:** Docker and Kubernetes (AWS EKS/GKE) for containerization and orchestration.
*   **Design Philosophy:** Domain-Driven Design (DDD) with a layered architecture to ensure modularity and separation of concerns.

## 2. Core Principles

1.  **Readability over Cleverness:** Code MUST be easily understood by any developer on the team.
2.  **Modularity and Single Responsibility:** Each component, function, or module MUST have a single, clearly defined purpose.
3.  **Testability and Maintainability:** Code MUST be designed to be easily tested and modified without introducing regressions.
4.  **Performance and Scalability:** Solutions MUST consider performance implications and be designed for future scaling.
5.  **Security by Design:** Security considerations MUST be integrated from the initial design phase.

## 3. Language-Specific Guidelines

### 3.1. Frontend (Next.js, React, TypeScript)

#### File Organization and Directory Structure

*   **MUST:** Organize files by feature or domain, following a co-located approach.
*   **MUST:** Use `pages`, `components`, `hooks`, `utils`, `types` directories at the root.
*   **MUST:** Place component-specific styles (if not using Tailwind directly) within the component's directory.

```
// MUST: Feature-based organization
/src
├── pages
│   ├── index.tsx
│   └── dashboard
│       └── [brandId].tsx
├── components
│   ├── common
│   │   └── Button.tsx
│   └── dashboard
│       ├── BrandOverviewCard.tsx
│       └── ApplicantTable.tsx
├── hooks
│   └── useAuth.ts
├── utils
│   └── api.ts
├── types
│   └── index.ts
└── styles
    └── globals.css
```

```
// MUST NOT: Overly nested or generic structure
/src
├── views
│   ├── Dashboard
│   │   └── BrandPage.tsx
├── shared
│   ├── ui
│   │   └── Button.tsx
│   └── hooks
│       └── useApi.ts
```

#### Import/Dependency Management

*   **MUST:** Use absolute imports for modules within the `src` directory. Configure `tsconfig.json` for path aliases.
*   **MUST:** Order imports: React/Next.js, external libraries, internal modules, relative imports (styles).
*   **MUST:** Use named imports for specific exports, default imports for single exports.

```typescript
// MUST: Absolute imports and ordered
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

import { getBrandData } from '@/services/brandService';
import { Brand } from '@/types';

import BrandOverviewCard from '@/components/dashboard/BrandOverviewCard';
import styles from './DashboardPage.module.css'; // Example for module CSS
```

```typescript
// MUST NOT: Relative imports for deep paths, unorganized
import BrandOverviewCard from '../../../components/dashboard/BrandOverviewCard';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { Brand } from '../../types';
```

#### Error Handling Patterns

*   **MUST:** Use `try-catch` blocks for asynchronous operations.
*   **MUST:** Display user-friendly error messages in the UI.
*   **MUST:** Log detailed errors to a centralized logging service (e.g., Sentry).

```typescript
// MUST: Robust error handling in components
async function fetchDashboardData() {
  try {
    const data = await getBrandData(brandId);
    setBrandData(data);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    // Display error to user
    alert('Failed to load dashboard data. Please try again.');
    // Log to external service
    // Sentry.captureException(error);
  }
}
```

### 3.2. Backend (Node.js, Express, TypeScript, Prisma)

#### File Organization and Directory Structure

*   **MUST:** Follow a Domain-Driven Design (DDD) approach with clear separation of concerns.
*   **MUST:** Structure by domain (`auth`, `sheet`, `snsValidation`, `mail`, `dashboard`), each containing `controller`, `service`, `repository` (or `provider`) files.
*   **MUST:** Place common utilities, DTOs, and middleware in a `common` directory.
*   **MUST:** Separate job definitions into a `jobs` directory.

```
// MUST: Domain-driven and layered architecture
/src
├── auth
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.repository.ts
├── sheet
│   ├── sheet.controller.ts
│   ├── sheet.service.ts
│   └── sheet.repository.ts
├── snsValidation
│   ├── sns.controller.ts
│   ├── sns.service.ts
│   └── sns.provider.ts // For external API/crawling logic
├── mail
│   ├── mail.controller.ts
│   ├── mail.service.ts
│   └── mail.provider.ts // For SendGrid integration
├── common
│   ├── dtos
│   │   └── ApplicantDto.ts
│   ├── middleware
│   │   └── authMiddleware.ts
│   └── utils
│       └── pagination.ts
├── config
│   └── index.ts
├── jobs
│   ├── sheetSyncJob.ts
│   └── mailDispatchJob.ts
├── prisma
│   └── schema.prisma
└── app.ts // Entry point
```

```
// MUST NOT: Monolithic or flat structure
/src
├── controllers
│   ├── authController.ts
│   └── dataController.ts
├── services
│   ├── authService.ts
│   └── dataService.ts
├── models
│   ├── User.ts
│   └── Applicant.ts
├── routes.ts
└── server.ts
```

#### Import/Dependency Management

*   **MUST:** Use absolute imports configured via `tsconfig.json` paths.
*   **MUST:** Order imports: Node.js built-ins, external libraries, internal modules.
*   **MUST:** Inject dependencies (e.g., services into controllers, repositories into services) rather than direct instantiation for testability.

```typescript
// MUST: Absolute imports and dependency injection
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

import { AuthService } from '@/auth/auth.service';
import { UserLoginDto } from '@/common/dtos/UserLoginDto';
import { AppError } from '@/common/errors/AppError';

export class AuthController {
  constructor(private authService: AuthService) {} // Dependency injection

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as UserLoginDto;
      const token = await this.authService.authenticate(email, password);
      res.json({ token });
    } catch (error) {
      next(error); // Pass to error handling middleware
    }
  }
}
```

#### Error Handling Patterns

*   **MUST:** Centralize error handling using Express middleware.
*   **MUST:** Define custom error classes for specific application errors (e.g., `NotFoundError`, `ValidationError`).
*   **MUST:** Return consistent JSON error responses to the client.
*   **MUST:** Log all unhandled exceptions and critical errors.

```typescript
// MUST: Custom error class
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as expected error
    Error.captureStackTrace(this, this.constructor);
  }
}

// MUST: Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  console.error('UNHANDLED ERROR:', err); // Log unexpected errors
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  });
});

// MUST NOT: Catching and sending different error responses everywhere
// In a controller:
// try { ... } catch (error) { res.status(400).json({ message: error.message }); }
// This leads to inconsistent error responses.
```

## 4. Code Style Rules

### MUST Follow:

*   **Consistent Naming Conventions:**
    *   **Rationale:** Improves readability and predictability.
    *   **Rule:**
        *   Variables and functions: `camelCase` (e.g., `applicantCount`, `processSheetData`).
        *   Classes and types: `PascalCase` (e.g., `ApplicantService`, `UserDto`).
        *   Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`).
        *   Files: `kebab-case` for directories and `kebab-case.ts` for files (e.g., `sns-validation.service.ts`).
*   **Strict Type Usage (TypeScript):**
    *   **Rationale:** Enhances code reliability, enables better tooling, and reduces runtime errors.
    *   **Rule:** Explicitly define types for function parameters, return values, and complex variables. Avoid `any` unless absolutely necessary (e.g., during rapid prototyping or for highly dynamic data, with a comment explaining the rationale).
*   **Meaningful Variable and Function Names:**
    *   **Rationale:** Self-documenting code reduces the need for extensive comments.
    *   **Rule:** Names MUST clearly indicate their purpose or the data they hold.
    *   ```typescript
        // MUST: Meaningful names
        const selectedApplicants: Applicant[] = [];
        function validateSnsInfluence(profileUrl: string): Promise<boolean> { /* ... */ }
        ```
    *   ```typescript
        // MUST NOT: Ambiguous names
        const arr = []; // What does 'arr' hold?
        function process(data: any) { /* ... */ } // What is being processed?
        ```
*   **Concise Functions and Methods:**
    *   **Rationale:** Improves readability, testability, and reduces complexity.
    *   **Rule:** Functions/methods MUST ideally do one thing and do it well. Keep them short (e.g., under 50 lines of code, excluding comments/empty lines).
*   **Use `async/await` for Asynchronous Operations:**
    *   **Rationale:** Simplifies asynchronous code, making it more readable and easier to debug than traditional Promise chains.
    *   **Rule:** Always use `async/await` for Promise-based operations.
    *   ```typescript
        // MUST: Use async/await
        async function fetchUserData(userId: string) {
          try {
            const user = await userRepository.findById(userId);
            return user;
          } catch (error) {
            console.error('Error fetching user:', error);
            throw new AppError('User not found', 404);
          }
        }
        ```
    *   ```typescript
        // MUST NOT: Chained .then/.catch where async/await is clearer
        function fetchUserData(userId: string) {
          return userRepository.findById(userId)
            .then(user => user)
            .catch(error => {
              console.error('Error fetching user:', error);
              throw new AppError('User not found', 404);
            });
        }
        ```
*   **Consistent Code Formatting:**
    *   **Rationale:** Maintains a uniform appearance across the codebase, reducing cognitive load.
    *   **Rule:** Use Prettier and ESLint with a shared configuration. Configure IDEs to format on save.
        *   Indentation: 2 spaces.
        *   Quotes: Single quotes (`'`).
        *   Semicolons: Always use.
        *   Trailing commas: `es5`.

### MUST NOT Do:

*   **Making Huge, Multi-Responsibility Modules in a Single File:**
    *   **Rationale:** Violates the Single Responsibility Principle, leading to tightly coupled, hard-to-maintain, and untestable code.
    *   **Avoid:** A single file containing multiple unrelated controllers, services, and repository logic.
    *   ```typescript
        // MUST NOT: Monolithic file
        // user.ts
        // Contains User model, User CRUD service, User authentication logic, and User API routes.
        class UserService { /* ... */ }
        class UserController { /* ... */ }
        function authenticateUser() { /* ... */ }
        // ... and more
        ```
*   **Define Complex State Management Patterns Arbitrarily:**
    *   **Rationale:** Introduces unnecessary complexity and boilerplate, especially for a project of this scale.
    *   **Avoid:** Implementing custom, overly abstract state management solutions (e.g., a bespoke Redux-like store) when simpler solutions (React Context, Zustand/Jotai for local/global state) suffice.
*   **Common Mistakes in the Specific Tech Stack:**
    *   **Backend (Node.js/Express):**
        *   **MUST NOT:** Block the event loop with synchronous I/O operations or CPU-intensive tasks. Use asynchronous alternatives.
        *   **MUST NOT:** Directly expose database models or ORM instances to controllers. Always use a service layer.
        *   **MUST NOT:** Hardcode sensitive information (API keys, secrets). Use environment variables.
    *   **Frontend (Next.js/React):**
        *   **MUST NOT:** Mutate state directly. Always use state setter functions or immutability helpers.
        *   **MUST NOT:** Forget `key` props when rendering lists of components.
        *   **MUST NOT:** Perform heavy computations directly in render functions; use `useMemo` or `useCallback` when necessary.
    *   **Prisma:**
        *   **MUST NOT:** Directly access `PrismaClient` instances in controllers or frontend code. Encapsulate database operations within repository classes.
        *   **MUST NOT:** Neglect proper error handling for database operations.

## 5. Architecture Patterns

### Component/Module Structure Guidelines

*   **Layered Architecture (Backend):**
    *   **Presentation Layer (Controllers):** Handles HTTP requests, input validation, and delegates to the service layer. MUST NOT contain business logic.
    *   **Service Layer (Services):** Contains core business logic, orchestrates operations across multiple repositories, and applies domain rules.
    *   **Data Access Layer (Repositories):** Abstracts database interactions. Responsible for CRUD operations on a single entity or aggregate. MUST NOT contain business logic.
    *   **Infrastructure Layer (Providers):** Handles external integrations (e.g., Google Sheets API, SendGrid API, SNS crawlers).

```typescript
// MUST: Clear separation of concerns (Backend)
// In auth.controller.ts
class AuthController {
  constructor(private authService: AuthService) {} // Dependency injection
  async login(req: Request, res: Response) { /* ... */ } // Delegates to service
}

// In auth.service.ts
class AuthService {
  constructor(private authRepository: AuthRepository) {} // Dependency injection
  async authenticate(email: string, passwordHash: string) {
    const user = await this.authRepository.findByEmail(email); // Uses repository
    // ... business logic ...
  }
}

// In auth.repository.ts
class AuthRepository {
  constructor(private prisma: PrismaClient) {}
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } }); // Direct DB interaction
  }
}
```

### Data Flow Patterns

*   **Request-Response Cycle:**
    *   **MUST:** Frontend sends RESTful JSON requests to the Backend API.
    *   **MUST:** Backend processes requests, interacts with DB/services, and sends JSON responses.
*   **Asynchronous Job Processing:**
    *   **MUST:** Use Bull (on Redis) for background tasks (e.g., Google Sheet synchronization, SNS validation, email dispatch).
    *   **MUST:** Controllers MUST enqueue jobs and return immediate responses to the client, rather than waiting for long-running tasks to complete.
    *   ```typescript
        // MUST: Enqueue job for background processing
        // In sheet.controller.ts
        async function triggerSheetSync(req: Request, res: Response) {
          const { sheetId } = req.body;
          await sheetSyncQueue.add('sync-sheet', { sheetId }); // Add job to queue
          res.status(202).json({ message: 'Sheet synchronization initiated.' }); // Respond immediately
        }
        ```
    *   ```typescript
        // MUST NOT: Blocking operation
        // In sheet.controller.ts
        async function triggerSheetSync(req: Request, res: Response) {
          const { sheetId } = req.body;
          await sheetService.syncSheet(sheetId); // Direct call, blocks response
          res.status(200).json({ message: 'Sheet synchronization completed.' });
        }
        ```

### State Management Conventions (Frontend)

*   **MUST:** Use React's `useState` and `useReducer` for local component state.
*   **MUST:** Use React Context API for global state that is shared across many components but doesn't change frequently (e.g., authentication status, user preferences).
*   **MUST:** For complex, frequently updated global state, consider a lightweight library like Zustand or Jotai. Avoid Redux unless project complexity explicitly demands it.

### API Design Standards (Backend)

*   **RESTful Principles:**
    *   **MUST:** Use meaningful, plural resource names in URLs (e.g., `/api/applicants`, `/api/brands`).
    *   **MUST:** Use standard HTTP methods (GET, POST, PUT, DELETE) for corresponding CRUD operations.
    *   **MUST:** Use appropriate HTTP status codes (e.g., 200 OK, 201 Created, 202 Accepted, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
*   **Data Transfer Objects (DTOs):**
    *   **MUST:** Define DTOs for request bodies and response payloads to ensure clear data contracts and validation.
    *   ```typescript
        // MUST: Use DTOs for request validation and clear contracts
        // In common/dtos/CreateApplicantDto.ts
        export class CreateApplicantDto {
          @IsString()
          @IsNotEmpty()
          name: string;

          @IsUrl()
          snsLink: string;

          @IsEmail()
          email: string;
        }

        // In applicant.controller.ts
        async createApplicant(req: Request, res: Response) {
          const applicantData: CreateApplicantDto = req.body;
          // Validate applicantData using a validation library (e.g., class-validator)
          // ...
        }
        ```
*   **Versioning:**
    *   **MUST:** Implement API versioning (e.g., `/api/v1/applicants`) to allow for backward compatibility.
*   **Authentication and Authorization:**
    *   **MUST:** Use JWT for token-based authentication.
    *   **MUST:** Implement middleware for route protection and role-based access control.