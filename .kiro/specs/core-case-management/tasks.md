# Implementation Plan: Core Case Management

## Overview

Implementation plan for the core case management module. This is the foundational module that handles case CRUD operations, reference generation, state management, configuration, and the admin panel. Built with Node.js + Express backend on Clouding.io VPS (Spain) and vanilla JS frontend on Cloudflare Pages.

## Tasks

- [x] 1. Project Setup and Infrastructure

  - [x] 1.1 Initialize project structure with package.json and ES modules
    - Create directory structure (src/server, src/client, migrations)
    - Configure package.json with type: "module"
    - Install dependencies: express, better-sqlite3, cors
    - _Requirements: 8.1_
  - [x] 1.2 Create SQLite database schema and migrations
    - Write 001_initial_schema.sql with all tables
    - Create migration runner script
    - Add indexes for performance
    - _Requirements: 8.1, 8.2_
  - [x] 1.3 Set up Express server with basic middleware
    - Create src/server/index.js entry point
    - Configure CORS, JSON parsing, error handling
    - Add health check endpoint
    - _Requirements: 8.1_

- [x] 2. Database Layer and Services

  - [x] 2.1 Implement database connection wrapper
    - Create database.js with connection management
    - Add readonly mode support for queries
    - _Requirements: 8.1, 8.3_
  - [x] 2.2 Implement Reference Generator service
    - Create referenceGenerator.js
    - Implement generateAragReference() - IY + 6 digits
    - Implement generateParticularReference() - IY-YY-NNN
    - Implement validateAragExternalReference() - DJ00xxxxxx
    - Add atomic counter increment
    - _Requirements: 1.2, 1.7, 2.1, 2.3, 7.1, 7.3, 7.4_
  - [x] 2.3 Write property tests for Reference Generator
    - **Property 1: ARAG Reference Format Validation**
    - **Property 2: Internal Reference Format and Uniqueness**
    - **Property 3: Sequential Numbering for Particular Cases**
    - **Validates: Requirements 1.1, 1.2, 1.7, 2.1, 2.3, 7.1, 7.4, 7.5**
  - [x] 2.4 Implement Case Service
    - Create caseService.js
    - Implement create() with validation and reference generation
    - Implement getById(), list(), update()
    - Implement archive() with closure date validation
    - Implement transitionToJudicial()
    - _Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.6, 4.1-4.8_
  - [x] 2.5 Write property tests for Case Service
    - **Property 4: Required Fields Validation**
    - **Property 5: ARAG Reference Uniqueness**
    - **Property 6: Archive Requires Closure Date**
    - **Property 7: State Transitions Validity**
    - **Property 8: Case Data Round-Trip Persistence**
    - **Validates: Requirements 1.3, 1.8, 2.4, 3.1, 3.2, 4.4-4.6, 7.2, 8.1, 8.3**

- [x] 3. Checkpoint - Backend Services

  - Ensure all property tests pass
  - Verify database operations work correctly
  - Ask the user if questions arise

- [x] 4. API Routes

  - [x] 4.1 Implement Cases API routes
    - GET /api/cases - list with filters and pagination
    - GET /api/cases/:id - get by ID
    - POST /api/cases - create new case
    - PUT /api/cases/:id - update case
    - POST /api/cases/:id/archive - archive case
    - POST /api/cases/:id/judicial - transition to judicial
    - _Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.6, 4.1-4.8, 5.1-5.7_
  - [x] 4.2 Implement Dashboard API route
    - GET /api/dashboard - return metrics
    - Count entries this month by type
    - Count archived this month by type
    - Count pending (open) cases by type
    - _Requirements: 9.1-9.6_
  - [x] 4.3 Write property test for Dashboard metrics
    - **Property 9: Dashboard Metrics Accuracy**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  - [x] 4.4 Implement Configuration API routes
    - GET /api/config - get all configuration
    - PUT /api/config - update configuration
    - Validate fee/VAT as positive numbers
    - Validate email format
    - _Requirements: 12.1-12.9_
  - [x] 4.5 Write property test for Configuration validation
    - **Property 10: Configuration Value Validation**
    - **Validates: Requirements 12.8, 12.9**
  - [x] 4.6 Implement Export/Import API routes
    - POST /api/export - export all data as JSON
    - POST /api/import - import data from JSON
    - _Requirements: 8.4, 8.5_
  - [x] 4.7 Write property test for Export/Import
    - **Property 11: Export/Import Round-Trip**
    - **Validates: Requirements 8.4, 8.5**

- [x] 5. Admin Panel API

  - [x] 5.1 Implement Admin API routes
    - GET /api/admin/tables - list tables with counts
    - GET /api/admin/table/:name - get table contents with pagination
    - POST /api/admin/query - execute SELECT query
    - Add security: only SELECT, block dangerous keywords
    - _Requirements: 14.1-14.8_

- [x] 6. Checkpoint - Backend Complete

  - Ensure all API routes work correctly
  - Run all property tests
  - Test with sample data
  - Ask the user if questions arise

- [x] 7. Frontend Setup

  - [x] 7.1 Create HTML structure and CSS variables
    - Create index.html with app shell
    - Create variables.css with design tokens from Figma
    - Create main.css with base styles
    - _Requirements: Design Reference_
  - [x] 7.2 Implement SPA Router
    - Create router.js with hash-based routing
    - Routes: /, /cases, /cases/:id, /cases/new, /config, /admin
    - Handle navigation and history
    - _Requirements: 5.1, 6.1_
  - [x] 7.3 Implement API Client
    - Create api.js with fetch wrapper
    - Add methods for all API endpoints
    - Handle errors consistently
    - _Requirements: All_

- [ ] 8. Frontend Components

  - [ ] 8.1 Implement Sidebar component
    - Navigation links with icons
    - Active state highlighting
    - User info at bottom
    - _Requirements: Design Reference_
  - [ ] 8.2 Implement Dashboard component
    - Metrics cards (entries, archived, pending)
    - Quick action button (Nuevo Expediente)
    - Recent cases table
    - _Requirements: 9.1-9.6_
  - [ ] 8.3 Implement Case List component
    - Table with columns: Reference, Client, Type, State, Entry Date, Actions
    - Type filter tabs (Todos, ARAG, Particulares, Turno Oficio)
    - Search input
    - Pagination
    - Color-coded badges
    - _Requirements: 5.1-5.7_
  - [ ] 8.4 Implement Case Form component
    - Dynamic form based on case type
    - Client name input (required)
    - ARAG reference input (ARAG only, validated)
    - Designation input (Turno only)
    - Entry date picker (default today)
    - Client-side validation
    - _Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.6_
  - [ ] 8.5 Implement Case Detail component
    - Display all case data
    - Breadcrumb navigation
    - Observations textarea with auto-save
    - Action buttons based on type/state
    - Document history section (placeholder)
    - Email history section (placeholder)
    - _Requirements: 6.1-6.7, 10.1-10.6, 11.1-11.5, 13.1-13.5_
  - [ ] 8.6 Implement Configuration component
    - ARAG fee input
    - VAT rate input
    - ARAG email input
    - Mileage table (7 districts)
    - Save button with validation
    - _Requirements: 12.1-12.9_
  - [ ] 8.7 Implement Admin Panel component
    - Table list sidebar
    - Data grid with pagination
    - Query editor with Ctrl+Enter
    - Results display
    - _Requirements: 14.1-14.8_

- [ ] 9. Checkpoint - Frontend Complete

  - Test all components manually
  - Verify responsive design
  - Check accessibility basics
  - Ask the user if questions arise

- [ ] 10. Integration and Polish

  - [ ] 10.1 Wire frontend to backend API
    - Connect all components to API client
    - Handle loading states
    - Handle error states
    - _Requirements: All_
  - [ ] 10.2 Add toast notifications
    - Success messages (case created, saved, etc.)
    - Error messages (validation, server errors)
    - _Requirements: Error Handling_
  - [ ] 10.3 Implement archive modal
    - Date picker for closure date
    - Confirmation before archiving
    - _Requirements: 4.4, 4.5, 4.6_
  - [ ] 10.4 Implement judicial transition modal
    - Date picker for transition date
    - District selector (7 options)
    - _Requirements: 4.2, 4.3_

- [ ] 11. Deployment Preparation

  - [ ] 11.1 Create PM2 ecosystem config
    - Configure process management
    - Set environment variables
    - _Requirements: Deployment Guide_
  - [ ] 11.2 Create deployment documentation
    - Clouding.io setup steps
    - Cloudflare Tunnel configuration
    - Zero Trust setup
    - _Requirements: Deployment Guide_
  - [ ] 11.3 Create backup script
    - Daily SQLite backup cron job
    - Retention policy (30 days)
    - _Requirements: 8.4_

- [ ] 12. Final Checkpoint
  - Run all tests
  - Manual testing of all flows
  - Verify deployment documentation
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Frontend uses vanilla JS with ES Modules (no frameworks)
- Backend uses Express with better-sqlite3
- All data stored in Spain (Clouding.io Barcelona)
