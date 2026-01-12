# Implementation Plan: Core Case Management

## Overview

Implementation plan for the core case management module. This is the foundational module that handles case CRUD operations, reference generation, state management, configuration, and the admin panel. Built with Node.js + Express backend on Clouding.io VPS (Spain) and vanilla JS frontend on Cloudflare Pages.

## Tasks

- [x] 1. Project Setup and Infrastructure

  - [x] 1.1 Initialize project structure with package.json and ES modules
  - [x] 1.2 Create SQLite database schema and migrations
  - [x] 1.3 Set up Express server with basic middleware

- [x] 2. Database Layer and Services

  - [x] 2.1 Implement database connection wrapper
  - [x] 2.2 Implement Reference Generator service
  - [x] 2.3 Write property tests for Reference Generator
  - [x] 2.4 Implement Case Service
  - [x] 2.5 Write property tests for Case Service

- [x] 3. Checkpoint - Backend Services ✓

- [x] 4. API Routes

  - [x] 4.1 Implement Cases API routes
  - [x] 4.2 Implement Dashboard API route
  - [x] 4.3 Write property test for Dashboard metrics
  - [x] 4.4 Implement Configuration API routes
  - [x] 4.5 Write property test for Configuration validation
  - [x] 4.6 Implement Export/Import API routes
  - [x] 4.7 Write property test for Export/Import

- [x] 5. Admin Panel API

  - [x] 5.1 Implement Admin API routes

- [x] 6. Checkpoint - Backend Complete ✓

- [x] 7. Frontend Setup

  - [x] 7.1 Create HTML structure and CSS variables
  - [x] 7.2 Implement SPA Router
  - [x] 7.3 Implement API Client

- [x] 8. Frontend Components

  - [x] 8.1 Implement Sidebar component (in index.html)
  - [x] 8.2 Implement Dashboard component (dashboard.js)
  - [x] 8.3 Implement Case List component (caseList.js)
  - [x] 8.4 Implement Case Form component (caseForm.js)
  - [x] 8.5 Implement Case Detail component (caseDetail.js)
  - [x] 8.6 Implement Configuration component (configuration.js)
  - [x] 8.7 Implement Admin Panel component (adminPanel.js)

- [x] 9. Checkpoint - Frontend Complete ✓

- [x] 10. Integration and Polish

  - [x] 10.1 Wire frontend to backend API
  - [x] 10.2 Add toast notifications
  - [x] 10.3 Implement archive modal
  - [x] 10.4 Implement judicial transition modal

- [x] 11. Additional Modules (Beyond Original Scope)

  - [x] 11.1 Facturación ARAG module (facturacionArag.js, facturacionList.js)
  - [x] 11.2 Particulares module (particulares.js, particularesList.js)
  - [x] 11.3 Turno de Oficio module (turnoOficio.js, turnoList.js)
  - [x] 11.4 Estadísticas dashboard (estadisticas.js)

- [ ] 12. Deployment Preparation

  - [x] 12.1 Create PM2 ecosystem config (ecosystem.config.js exists)
  - [ ] 12.2 Create Clouding.io deployment scripts
    - Setup script for VPS (Node.js, PM2, cloudflared)
    - Deploy script for updates
  - [ ] 12.3 Create Cloudflare Tunnel configuration
    - Tunnel setup instructions
    - Zero Trust access policies
  - [ ] 12.4 Create backup script
    - Daily SQLite backup cron job
    - 30-day retention policy

- [ ] 13. Final Checkpoint
  - [ ] Run all tests
  - [ ] Manual testing of all flows
  - [ ] Deploy to Clouding.io
  - [ ] Configure Cloudflare Zero Trust

## Current Status

**COMPLETED:**

- Full backend (API, services, database)
- Full frontend (all core components + extra modules)
- All property-based tests
- Git repository setup (github.com/josfko/recordplus)

**REMAINING:**

- Deployment scripts for Clouding.io
- Cloudflare Tunnel + Zero Trust setup
- Backup automation
- Production deployment

## File Structure (Implemented)

```
recordplus/
├── src/
│   ├── client/
│   │   ├── css/main.css, variables.css
│   │   ├── js/
│   │   │   ├── app.js, router.js, api.js
│   │   │   └── components/
│   │   │       ├── dashboard.js
│   │   │       ├── caseList.js, caseDetail.js, caseForm.js
│   │   │       ├── configuration.js, adminPanel.js
│   │   │       ├── facturacionArag.js, facturacionList.js
│   │   │       ├── particulares.js, particularesList.js
│   │   │       ├── turnoOficio.js, turnoList.js
│   │   │       └── estadisticas.js
│   │   └── index.html
│   └── server/
│       ├── index.js, database.js
│       ├── routes/ (cases, dashboard, config, admin, exportImport)
│       ├── services/ (caseService, referenceGenerator, etc.)
│       └── __tests__/
├── migrations/
├── data/
├── package.json
├── ecosystem.config.js
└── GIT_WORKFLOW.md
```
