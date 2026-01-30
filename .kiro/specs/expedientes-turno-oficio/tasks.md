# Implementation Plan: Expedientes Turno de Oficio

## Overview

Implementation of the Public Defender Cases (Expedientes Turno de Oficio) module. This is the simplest case type - no automatic document generation (unlike ARAG/Particulares). Focus is on case tracking, manual document uploads, state management, and archival.

**Key Differentiators from ARAG/Particulares:**
- NO MinutaWorkflowService or HojaEncargoWorkflowService
- NO PDF generation
- Simple file upload instead of document generation
- Three states: Abierto → Finalizado → Archivado

## Tasks

### Phase 1: Backend Validation

- [ ] 1. Add Turno de Oficio Validation
  - [ ] 1.1 Add validation function for Turno de Oficio cases
    - Add `validateTurnoOficio()` to caseService.js or create turnoValidation.js
    - Validate client_name (min 2 characters)
    - Validate entry_date (required, valid date)
    - Validate designation (required, non-empty)
    - _Requirements: 1.1, 1.2, 1.3, 12.1, 12.2, 12.3_
  - [ ] 1.2 Add state transition validation
    - Validate ABIERTO → FINALIZADO
    - Validate ABIERTO → ARCHIVADO (requires closure_date)
    - Validate FINALIZADO → ARCHIVADO (requires closure_date)
    - Block all transitions FROM ARCHIVADO
    - Validate closure_date not before entry_date
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 12.4, 12.5_
  - [ ] 1.3 Write property tests for validation
    - **Property 1: Designation Required**
    - **Property 3: State Transition Validity**
    - **Property 4: Closure Date Required for Archive**
    - **Property 9: Client Name Minimum Length**
    - **Validates: Requirements 1.1, 1.3, 4.2-4.6, 12.1-12.5**

- [ ] 2. Checkpoint - Backend Validation
  - Run all validation tests
  - Verify error messages are in Spanish
  - Ask user if questions arise

### Phase 2: API Routes

- [ ] 3. Create Turno de Oficio Routes
  - [ ] 3.1 Create turnoOficio.js routes file
    - Create src/server/routes/turnoOficio.js
    - Set up Express router
    - Add case loading middleware
    - _Requirements: All_
  - [ ] 3.2 Implement POST /api/turno/:id/finalize endpoint
    - Validate case is TURNO_OFICIO type
    - Validate current state is ABIERTO
    - Update state to FINALIZADO (using JUDICIAL column)
    - Return success message
    - _Requirements: 4.2_
  - [ ] 3.3 Implement POST /api/turno/:id/upload endpoint
    - Configure multer for file uploads
    - Validate case is TURNO_OFICIO type
    - Validate case is not archived
    - Accept PDF files only (max 10MB)
    - Store file in structured directory
    - Record in document_history with type='MANUAL_UPLOAD'
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_
  - [ ] 3.4 Register routes in main server
    - Import turnoOficioRouter in src/server/index.js
    - Mount at /api/turno
    - _Requirements: All_
  - [ ] 3.5 Write integration tests for API routes
    - Test finalize endpoint
    - Test upload endpoint
    - Test error cases (wrong type, archived, etc.)
    - **Property 5: No Automatic Documents**
    - **Property 6: Upload Blocked for Archived Cases**
    - **Property 7: Document History Recording**
    - **Validates: Requirements 5.1-5.6, 6.1-6.8**

- [ ] 4. Checkpoint - API Routes
  - Test all endpoints with curl/Postman
  - Verify file upload works correctly
  - Verify state transitions work
  - Ask user if questions arise

### Phase 3: Frontend API Client

- [ ] 5. Update API Client
  - [ ] 5.1 Add uploadDocument method to api.js
    - POST /api/turno/:id/upload with FormData
    - Handle multipart/form-data correctly
    - _Requirements: 6.1_
  - [ ] 5.2 Add finalizeTurnoCase method to api.js
    - POST /api/turno/:id/finalize
    - _Requirements: 4.2_
  - [ ] 5.3 Verify existing methods work for Turno de Oficio
    - listCases with type=TURNO_OFICIO
    - getCase for Turno de Oficio cases
    - updateCase for observations
    - archiveCase for closure
    - _Requirements: 9.1-9.9, 10.1-10.10_

- [ ] 6. Checkpoint - API Client
  - Verify all API methods work correctly
  - Test from browser console
  - Ask user if questions arise

### Phase 4: Frontend Components

- [ ] 7. Create Document Upload Modal
  - [ ] 7.1 Create documentUploadModal.js component
    - Create src/client/js/components/documentUploadModal.js
    - Implement drag-and-drop file selection
    - Implement description input
    - Implement upload progress indicator
    - Call api.uploadDocument on submit
    - Handle success/error states
    - _Requirements: 6.1, 6.2, 6.8_
  - [ ] 7.2 Add upload modal CSS styles
    - File drop zone styling
    - Drag-over state
    - Has-file state
    - Progress bar animation
    - _Requirements: 6.1_

- [ ] 8. Update TurnoOficioView Component
  - [ ] 8.1 Connect to real API data
    - Replace mock documents with real API call
    - Load case history from /api/cases/:id/history
    - _Requirements: 10.6, 10.7, 11.1-11.6_
  - [ ] 8.2 Implement document upload functionality
    - Add "Subir Documento" button handler
    - Open DocumentUploadModal on click
    - Refresh history after upload
    - _Requirements: 6.1, 10.7_
  - [ ] 8.3 Implement finalize functionality
    - Add "Finalizar" button for ABIERTO cases
    - Call api.finalizeTurnoCase
    - Update UI on success
    - _Requirements: 4.2_
  - [ ] 8.4 Implement archive functionality
    - Connect archive checkbox and date picker
    - Validate closure date before archiving
    - Call api.archiveCase
    - _Requirements: 8.1-8.6_
  - [ ] 8.5 Implement observations auto-save
    - Debounce input (1 second)
    - Call api.updateCase with observations
    - Show auto-save indicator
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 8.6 Display state-specific badges
    - Abierto = amber badge
    - Finalizado = blue badge
    - Archivado = gray badge
    - _Requirements: 4.7, 10.2_
  - [ ] 8.7 Display "no automatic documents" message
    - Add informational message in document section
    - "Los expedientes de Turno de Oficio no generan minutas automáticas"
    - _Requirements: 5.6_

- [ ] 9. Checkpoint - TurnoOficioView
  - Test document upload workflow
  - Test finalize workflow
  - Test archive workflow
  - Verify observations auto-save
  - Ask user if questions arise

- [ ] 10. Update TurnoListView Component
  - [ ] 10.1 Connect to real API data
    - Fetch cases with type=TURNO_OFICIO
    - Replace filter logic if needed
    - _Requirements: 9.1-9.7_
  - [ ] 10.2 Add state filtering
    - Add filter for Abierto/Finalizado/Archivado/Todos
    - Update case list on filter change
    - _Requirements: 9.4_
  - [ ] 10.3 Add search functionality
    - Search by client name, reference, or designation
    - Debounce search input
    - _Requirements: 9.5, 2.5_
  - [ ] 10.4 Display designation in case cards
    - Show designation number prominently
    - _Requirements: 2.2, 9.3_
  - [ ] 10.5 Add pagination if needed
    - Handle large case lists
    - _Requirements: 9.2_
  - [ ] 10.6 Show Finalizado state section
    - Currently only shows Abierto and Judicial
    - Add section for Finalizado cases (map from JUDICIAL state)
    - _Requirements: 9.2_

- [ ] 11. Checkpoint - TurnoListView
  - Verify list displays all states correctly
  - Test filtering and search
  - Verify navigation to detail view
  - Ask user if questions arise

### Phase 5: State Management & Restrictions

- [ ] 12. Implement State Restrictions
  - [ ] 12.1 Block uploads for archived cases
    - Return error from API
    - Disable upload button in UI
    - _Requirements: 6.7, 8.3_
  - [ ] 12.2 Block finalize for non-ABIERTO cases
    - Return error from API
    - Hide/disable button in UI
    - _Requirements: 4.2_
  - [ ] 12.3 Allow observations edit for archived cases
    - Ensure observations field is editable
    - Verify API accepts observation updates for archived
    - _Requirements: 7.4, 8.5_
  - [ ] 12.4 Write property tests for restrictions
    - **Property 8: Observations Persistence**
    - **Validates: Requirements 6.7, 7.4, 8.3, 8.5**

- [ ] 13. Checkpoint - State Restrictions
  - Test all restricted actions on archived cases
  - Verify observations still editable when archived
  - Ask user if questions arise

### Phase 6: Integration Testing

- [ ] 14. Write Integration Tests
  - [ ] 14.1 Complete lifecycle test
    - Create TURNO_OFICIO case → Upload document → Finalize → Archive
    - Verify all history records created
    - _Requirements: All_
  - [ ] 14.2 Validation rejection tests
    - Attempt create without designation → Fail
    - Attempt create with short client name → Fail
    - Attempt archive without closure date → Fail
    - _Requirements: 12.1-12.5_
  - [ ] 14.3 State transition tests
    - ABIERTO → FINALIZADO → ARCHIVADO (valid)
    - ABIERTO → ARCHIVADO (valid with closure date)
    - ARCHIVADO → ABIERTO (invalid)
    - _Requirements: 4.2-4.6_
  - [ ] 14.4 Document upload tests
    - Upload PDF → Success
    - Upload non-PDF → Fail
    - Upload to archived → Fail
    - Upload > 10MB → Fail
    - _Requirements: 6.2, 6.3, 6.7_

- [ ] 15. Final Checkpoint
  - [ ] Run all tests (unit, property, integration)
  - [ ] Manual testing of all flows in browser
  - [ ] Test case creation from list view
  - [ ] Test document upload and download
  - [ ] Test finalize state transition
  - [ ] Test archive with closure date
  - [ ] Test observations auto-save
  - [ ] Test search and filtering
  - [ ] Verify all error messages are in Spanish

## Current Status

**COMPLETED:**
- Code written for all phases
- 24 unit tests passing in turnoOficioRoutes.test.js

**IN PROGRESS:**
- Verification needed (API routes not tested with HTTP requests, UI not tested in browser)

**REMAINING:**
- All checkpoints need manual verification
- API endpoint testing with curl/Postman
- Browser testing of UI components

## Notes

- This module is simpler than ARAG/Particulares - no workflow services needed
- Existing UI components exist but use mock data - need to connect to real API
- The `JUDICIAL` database state will be used to represent `FINALIZADO` for display
- Document uploads are PDF only, max 10MB
- Observations remain editable even for archived cases
- Internal references share the IY sequence with ARAG cases
- No email sending functionality (except manual, already exists)
- multer npm package required for file uploads (already in package.json)

## Dependencies

- Express router infrastructure (exists)
- multer for file uploads (in package.json)
- DocumentHistoryService (exists)
- CaseService (exists, needs validation extension)
- Existing UI components (turnoList.js, turnoOficio.js) - need updates
