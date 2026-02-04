# Implementation Plan: Data Persistence & CRUD Operations

## Overview

Implement robust data persistence by adding transaction handling to configuration and case operations, optimistic locking for concurrent updates, database pragma optimization, and frontend resilience with retry logic and caching.

## Tasks

- [ ] 1. Database Layer Hardening
  - [ ] 1.1 Add pragmas to database.js
    - Add `busy_timeout = 5000`
    - Add `synchronous = NORMAL`
    - Add `cache_size = -64000`
    - Add `temp_store = MEMORY`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 1.2 Add WAL checkpoint management
    - Implement `checkpointWAL()` function
    - Update `closeDatabase()` to checkpoint before close
    - _Requirements: 4.5, 4.6_
  - [ ] 1.3 Add integrity verification
    - Implement `verifyIntegrity()` function with PRAGMA quick_check
    - _Requirements: 4.7_

- [ ] 2. Error Messaging Foundation
  - [ ] 2.1 Create src/server/errors.js
    - AppError base class with code, message, field, details
    - ValidationError (400), NotFoundError (404), ConflictError (409), DatabaseError (500)
    - toJSON() method for consistent API responses
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ] 2.2 Create src/server/errorMessages.js
    - ErrorMessages factory with all message templates
    - Configuration errors (CONFIG_*)
    - Case errors (CASE_*)
    - Concurrency errors (CONFLICT_*)
    - Database errors (DB_*)
    - _Requirements: 9.2, 9.4, 9.5, 9.7_
  - [ ] 2.3 Update Express error handler in index.js
    - Use AppError.toJSON() for structured responses
    - Log full stack server-side, send clean message to client
    - _Requirements: 9.6_

- [ ] 3. Checkpoint - Error Foundation Complete
  - Test error classes return correct HTTP status codes
  - Test error messages are in Spanish
  - Test toJSON() produces expected format

- [ ] 4. Configuration Service Transaction Fix
  - [ ] 3.1 Create `ensureDefaults()` function
    - Extract initialization logic from getAll()
    - Wrap in transaction
    - Add `defaultsInitialized` flag
    - _Requirements: 1.5, 1.6_
  - [ ] 3.2 Update `getAll()` to not call initializeDefaults
    - Remove the initializeDefaults() call
    - _Requirements: 1.5_
  - [ ] 3.3 Rewrite `update()` with transaction
    - Validation before transaction (existing)
    - Wrap all UPSERTs in single transaction
    - Use INSERT...ON CONFLICT pattern
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ] 3.4 Update index.js to call ensureDefaults()
    - Import ensureDefaults
    - Call on server startup before routes
    - _Requirements: 1.6_
  - [ ] 3.5 Write property tests for configuration
    - **Property 1: Configuration Update Atomicity**
    - **Property 2: Configuration Validation Barrier**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 4. Checkpoint - Configuration Service Complete
  - Run configuration property tests
  - Manual test: save config, refresh, verify persistence
  - Manual test: invalid email in batch, verify rollback

- [ ] 5. Case Service Atomic Creation
  - [ ] 5.1 Create `generateAragReferenceInTransaction(db)` helper
    - Accept db parameter to use within transaction
    - Use RETURNING clause for atomic increment
    - _Requirements: 2.1, 2.6_
  - [ ] 5.2 Create `generateParticularReferenceInTransaction(db, year)` helper
    - Same pattern as ARAG
    - _Requirements: 2.1, 2.6_
  - [ ] 5.3 Rewrite `create()` with transaction
    - Move duplicate check inside transaction
    - Call transaction-aware reference generators
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 5.4 Create `getByIdInternal(db, id)` helper
    - For use within transactions
    - _Requirements: 2.1_
  - [ ] 5.5 Write property tests for case creation
    - **Property 3: Case Creation Atomicity**
    - **Property 4: Reference Counter Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 6. Checkpoint - Case Creation Complete
  - Run case creation property tests
  - Manual test: create ARAG case, verify reference generated
  - Manual test: duplicate ARAG reference, verify error and no counter increment

- [ ] 7. Database Migration for Version Column
  - [ ] 7.1 Create migrations/003_optimistic_locking.sql
    - ALTER TABLE cases ADD COLUMN version
    - CREATE TABLE _schema_version
    - INSERT schema version record
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ] 7.2 Test migration on copy of database
    - Run migration
    - Verify existing cases have version = 1
    - Verify _schema_version table exists
    - _Requirements: 8.5, 8.6_

- [ ] 8. Case Service Optimistic Locking
  - [ ] 8.1 Add version parameter to `update()` function
    - Optional `expectedVersion` parameter
    - _Requirements: 3.2_
  - [ ] 8.2 Implement version checking logic
    - Compare expectedVersion with current version
    - Throw ConflictError on mismatch
    - _Requirements: 3.3_
  - [ ] 8.3 Include version in WHERE clause
    - Add `AND version = ?` to UPDATE statement
    - Check result.changes for conflict detection
    - _Requirements: 3.5_
  - [ ] 8.4 Update mapRowToCase to include version
    - Add version field to returned object
    - _Requirements: 3.1_
  - [ ] 8.5 Write property tests for optimistic locking
    - **Property 5: Optimistic Lock Enforcement**
    - **Property 6: Version Monotonic Increment**
    - **Validates: Requirements 3.3, 3.4, 3.5**

- [ ] 9. Checkpoint - Backend Complete
  - Run all backend property tests
  - Run full test suite: `npm test`
  - Manual API testing with curl

- [ ] 10. Frontend Retry Logic
  - [ ] 10.1 Create RetryableRequest class in api.js
    - Constructor with maxRetries, baseDelay, maxDelay
    - `isRetryable(error)` method
    - `execute(requestFn)` method with exponential backoff
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ] 10.2 Update critical API methods to use retry
    - getConfig() with retry
    - getDashboard() with retry
    - _Requirements: 5.1_

- [ ] 11. Frontend Configuration Caching
  - [ ] 11.1 Create ConfigCache class in api.js
    - `static get()` with TTL check
    - `static set(data)` with timestamp
    - `static invalidate()`
    - _Requirements: 6.1, 6.2, 6.5, 6.6_
  - [ ] 11.2 Update getConfig() to use cache
    - Check cache first
    - Fetch on miss or expiration
    - Set cache after fetch
    - _Requirements: 6.2, 6.4_
  - [ ] 11.3 Update updateConfig() to invalidate cache
    - Call ConfigCache.invalidate() after successful update
    - _Requirements: 6.3_

- [ ] 12. Frontend Error Recovery
  - [ ] 12.1 Create ErrorRecovery class
    - `static handleError(error, context)` method
    - Context-specific recovery actions
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [ ] 12.2 Update configuration.js to track version
    - Include version in update calls (for future case editing)
    - Handle ConflictError with reload
    - _Requirements: 3.6, 7.1_
  - [ ] 12.3 Update caseDetail.js for version tracking
    - Store version from loaded case
    - Send version with update requests
    - Handle version conflict errors
    - _Requirements: 3.6, 7.1_

- [ ] 13. Checkpoint - Frontend Complete
  - Test retry logic (simulate network failure with browser dev tools)
  - Test cache (check localStorage, verify TTL)
  - Test error recovery (version conflict scenario)

- [ ] 14. Final Checkpoint
  - [ ] Run all tests: `npm test`
  - [ ] Manual E2E testing
    - Configuration save/load cycle
    - Case creation (verify atomicity)
    - Concurrent case editing (verify conflict detection)
    - Network interruption (verify retry)
  - [ ] Verify migration on production database copy
  - [ ] Deploy to staging for final verification

## Current Status

**COMPLETED:**
- (none yet)

**IN PROGRESS:**
- Specification and planning

**REMAINING:**
- All implementation tasks (Phases 1-14)

## Notes

- Migration 003 must be applied to production database before deploying code changes
- The `ensureDefaults()` call in index.js must happen before any route handlers
- Frontend caching uses localStorage which may be unavailable in private browsing
- Property tests use fast-check with minimum 100 iterations
- Existing tests must continue to pass throughout implementation
- All database operations use better-sqlite3's synchronous API
- Transaction rollback is automatic on error with better-sqlite3
- Version column increment should happen via SQL, not application code
