# Requirements Document: Data Persistence & CRUD Operations

## Introduction

This module addresses critical data persistence issues in Record+ where configuration data and case records fail to persist reliably. Users must repeatedly re-enter configuration values because the current implementation lacks proper transaction handling, error recovery, and database safeguards.

The specification ensures all database write operations are atomic, errors are handled gracefully with recovery mechanisms, and the frontend provides resilience through caching and retry logic.

**Module Dependencies:**

- `core-case-management`: Provides the base case CRUD operations and database schema
- `database.js`: SQLite connection wrapper using better-sqlite3 (synchronous)

**Technical Context:**

- Backend: Node.js + Express (ES Modules), better-sqlite3 (synchronous)
- Frontend: Vanilla JavaScript SPA with hash-based routing
- Database: SQLite with WAL mode enabled
- Hosting: Clouding.io VPS (backend), Cloudflare Pages (frontend)
- Existing tables: `cases`, `configuration`, `reference_counters`, `document_history`, `email_history`

## Glossary

| Term | Definition |
|------|------------|
| **Transaction** | A sequence of database operations that execute atomically - all succeed or all fail |
| **Optimistic_Locking** | Concurrency control where records include a version number; updates fail if version changed |
| **WAL_Mode** | Write-Ahead Logging; SQLite journaling mode enabling concurrent reads during writes |
| **Busy_Timeout** | Time SQLite waits for locked resources before returning SQLITE_BUSY error |
| **Checkpoint** | WAL operation that transfers data from WAL file to main database file |
| **Exponential_Backoff** | Retry strategy where delay doubles between attempts (1s, 2s, 4s...) |
| **Transient_Error** | Temporary failure (network timeout, server overload) that may succeed on retry |
| **UPSERT** | INSERT that updates if record exists (INSERT...ON CONFLICT DO UPDATE) |
| **TTL** | Time To Live; duration after which cached data is considered stale |

## Requirements

### Requirement 1: Atomic Configuration Updates

**User Story:** As a law firm administrator, I want configuration changes to be saved completely or not at all, so that I never have partially saved settings that cause system inconsistencies.

#### Acceptance Criteria

1. WHEN a user saves multiple configuration values, THE System SHALL apply all changes in a single atomic transaction
2. WHEN any configuration value fails validation, THE System SHALL reject the entire update and preserve all previous values
3. WHEN a database error occurs mid-update, THE System SHALL rollback all changes made in that request
4. THE System SHALL use UPSERT pattern (INSERT...ON CONFLICT) for each configuration key
5. THE System SHALL NOT call initializeDefaults() on every getAll() request
6. WHEN the server starts, THE System SHALL initialize default configuration values once

### Requirement 2: Atomic Case Creation

**User Story:** As a legal assistant, I want case creation to be reliable, so that reference numbers are never "wasted" on failed case insertions and I don't have gaps in my reference sequences.

#### Acceptance Criteria

1. WHEN creating a case, THE System SHALL generate the reference number and insert the case within the same transaction
2. WHEN case insertion fails after reference generation, THE System SHALL rollback the reference counter increment
3. WHEN checking for duplicate ARAG references, THE System SHALL perform the check within the creation transaction
4. THE System SHALL ensure that no reference number is ever consumed without a corresponding case record
5. WHEN a ConflictError occurs (duplicate reference), THE System SHALL NOT increment any counters
6. THE System SHALL provide internal transaction-aware reference generation functions

### Requirement 3: Optimistic Locking for Concurrent Updates

**User Story:** As a user editing a case, I want to be warned if another user modified the case while I was editing, so that I don't accidentally overwrite their changes.

#### Acceptance Criteria

1. THE System SHALL add a `version` column to the cases table via migration
2. WHEN updating a case, THE System SHALL accept an optional `expectedVersion` parameter
3. WHEN expectedVersion is provided and differs from current version, THE System SHALL reject the update with ConflictError
4. WHEN a case is successfully updated, THE System SHALL increment the version number
5. THE System SHALL include version in the WHERE clause of update statements for safety
6. THE Frontend SHALL track case versions and send them with update requests

### Requirement 4: Database Connection Hardening

**User Story:** As a system administrator, I want the database to handle concurrent access gracefully, so that brief resource contention doesn't cause user-visible errors.

#### Acceptance Criteria

1. THE System SHALL configure busy_timeout pragma to 5000ms (5 seconds)
2. THE System SHALL configure synchronous pragma to NORMAL (safe with WAL mode)
3. THE System SHALL configure cache_size pragma to -64000 (64MB)
4. THE System SHALL configure temp_store pragma to MEMORY
5. WHEN the database connection closes, THE System SHALL perform a WAL checkpoint
6. THE System SHALL provide a checkpointWAL() function for manual checkpoint triggers
7. THE System SHALL provide a verifyIntegrity() function that runs PRAGMA quick_check

### Requirement 5: Frontend Retry Logic

**User Story:** As a user with an unstable network connection, I want the application to automatically retry failed requests, so that temporary network issues don't require me to manually retry.

#### Acceptance Criteria

1. WHEN a request fails with a transient error, THE System SHALL automatically retry up to 3 times
2. THE System SHALL use exponential backoff between retries (1s, 2s, 4s with jitter)
3. THE System SHALL classify NETWORK_ERROR, 5xx status (except 501), and 429 as retryable
4. THE System SHALL NOT retry 4xx client errors (except 429) or 501 Not Implemented
5. WHEN all retries are exhausted, THE System SHALL show the final error to the user
6. THE System SHALL add random jitter (0-1s) to backoff delays to prevent thundering herd

### Requirement 6: Frontend Configuration Caching

**User Story:** As a user, I want the application to load quickly even with a slow connection, so that I can start working immediately using cached configuration.

#### Acceptance Criteria

1. THE System SHALL cache configuration data in localStorage with a 5-minute TTL
2. WHEN getConfig() is called and valid cache exists, THE System SHALL return cached data immediately
3. WHEN configuration is successfully updated, THE System SHALL invalidate the cache
4. WHEN cache is expired or missing, THE System SHALL fetch fresh data from server
5. THE System SHALL handle localStorage unavailability gracefully (fall back to no caching)
6. THE Cache SHALL store both data and timestamp for TTL validation

### Requirement 7: Enhanced Error Recovery

**User Story:** As a user encountering errors, I want clear feedback and automatic recovery when possible, so that I can continue working without frustration.

#### Acceptance Criteria

1. WHEN a version conflict occurs, THE System SHALL display a message and offer to reload fresh data
2. WHEN a network error occurs, THE System SHALL display connection status and retry automatically
3. WHEN a validation error occurs, THE System SHALL highlight the problematic field
4. WHEN session expires, THE System SHALL display a message and reload the page
5. THE System SHALL provide an ErrorRecovery class with handleError(error, context) method
6. THE Error handler SHALL support context-specific recovery actions (e.g., reloadFn, highlightField)

### Requirement 8: Database Migration for Version Column

**User Story:** As a developer, I want a clean migration path to add optimistic locking, so that existing data is preserved and the system can be upgraded without data loss.

#### Acceptance Criteria

1. THE System SHALL create migration file 003_optimistic_locking.sql
2. THE Migration SHALL add `version` column with DEFAULT 1 to cases table
3. THE Migration SHALL create `_schema_version` table for tracking applied migrations
4. THE Migration SHALL be idempotent (safe to run multiple times)
5. THE System SHALL NOT require downtime for migration
6. THE Migration SHALL preserve all existing case data

### Requirement 9: Comprehensive Error Messaging

**User Story:** As a user or developer, I want error messages that clearly explain what went wrong, why it happened, and what I can do to fix it, so that I can quickly resolve issues without guessing.

#### Acceptance Criteria

1. THE System SHALL provide error messages in Spanish for user-facing errors
2. EVERY error message SHALL include: (a) what failed, (b) why it failed, (c) what to do next
3. THE System SHALL use consistent error codes across all layers (e.g., `CONFIG_VALIDATION_ERROR`, `CASE_NOT_FOUND`)
4. WHEN a validation error occurs, THE System SHALL specify which field failed and what the valid format is
5. WHEN a database error occurs, THE System SHALL translate technical errors into user-friendly messages
6. THE System SHALL log detailed technical information server-side while showing simplified messages to users
7. WHEN a conflict error occurs, THE System SHALL explain the conflict and provide recovery instructions
8. THE Frontend SHALL display errors with visual distinction (color, icon) based on severity (error, warning, info)
