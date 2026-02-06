# Record+ E2E Test Plan

Generated: 2026-02-06
Environment: recordplus.work (production VPS)

## UI Map Summary

### Pages Discovered
| Page | Route | Key Elements |
|------|-------|-------------|
| Dashboard | `#/` | 3 metric cards, case table, type filters, search, pagination |
| Expedientes | `#/cases` | Full case list, type filter tabs, search, pagination |
| Nuevo Expediente | `#/cases/new` | Type selector (ARAG/Particular/Turno), dynamic form fields |
| Case Detail | `#/cases/:id` | Info panel, observations, sidebar (Documentos, Correos Enviados) |
| Facturación ARAG List | `#/invoicing` | ARAG cases grouped by state, "Facturar" links |
| Facturación ARAG Detail | `#/invoicing/:id` | Minuta (203+IVA), Suplidos, Timeline, Archive |
| Particulares | `#/particulares` | State filter tabs, case table, "Hoja de Encargo" action |
| Turno de Oficio | `#/turno` | State tabs (Activos/Abiertos/Finalizados/Archivados/Todos) |
| Estadísticas | `#/stats` | Financial analysis, charts, breakdown by procedure type |
| Configuración | `#/config` | ARAG fees, mileage rates, SMTP, certificate, document path |
| Admin Panel | `#/admin` | Table browser, SQL query (SELECT only), backups tab |

### Existing Test Data
| ID | Reference | Client | Type | State |
|----|-----------|--------|------|-------|
| 1 | IY000001 / DJ00123456 | María González Ruiz - Arag Test | ARAG | Archivado |
| 2 | IY-26-001 | Test Particular Client | PARTICULAR | Abierto |
| 3 | IY000002 / TO-2026-001-MALAGA | Test Justiciable Turno | TURNO_OFICIO | Archivado |
| 4 | IY000003 / DJ00999999 | Test Verificación Botones | ARAG | Abierto |

---

## Test Suites

### Suite 1: Dashboard & Navigation (T1.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T1.1 | Dashboard loads with correct metrics | Happy | Navigate to #/, verify 3 cards show numbers |
| T1.2 | Dashboard case table shows all cases | Happy | Verify 4 cases listed with correct data |
| T1.3 | Type filter tabs work | Happy | Click ARAG/Particulares/Turno tabs, verify filtering |
| T1.4 | Search filters cases | Happy | Type client name, verify results filter |
| T1.5 | Search with no results | Edge | Search for nonexistent name, verify empty state |
| T1.6 | Sidebar navigation works | Happy | Click each sidebar link, verify correct page loads |
| T1.7 | Breadcrumb navigation works | Happy | In case detail, click breadcrumb links |
| T1.8 | "Ver todos" link goes to cases | Happy | Click "Ver todos" on dashboard |
| T1.9 | "Nuevo Expediente" button works | Happy | Click button, verify form loads |

### Suite 2: ARAG Case Lifecycle (T2.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T2.1 | Create ARAG case (happy path) | Happy | Fill form with valid DJ00 ref, submit |
| T2.2 | Create ARAG - missing client name | Validation | Submit with empty name, verify error |
| T2.3 | Create ARAG - invalid reference format | Validation | Enter "INVALID123", verify error |
| T2.4 | Create ARAG - duplicate reference | Edge | Use DJ00123456 (exists), verify conflict error |
| T2.5 | View ARAG case detail | Happy | Navigate to case, verify all fields |
| T2.6 | Edit observations auto-save | Happy | Type in observations, verify save toast |
| T2.7 | Transition to Judicial | Happy | Click "Pasar a Judicial", set date+district, confirm |
| T2.8 | Archive ARAG case | Happy | Click "Archivar", set date, confirm |
| T2.9 | Archived case is read-only | Edge | Verify no action buttons except observations |

### Suite 3: Particular Case Lifecycle (T3.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T3.1 | Create Particular case | Happy | Fill name+date, submit, verify IY-26-NNN ref |
| T3.2 | Create Particular - missing client name | Validation | Submit empty, verify error |
| T3.3 | View Particular case detail | Happy | Navigate, verify fields |
| T3.4 | Hoja de Encargo link works | Happy | Click "Hoja de Encargo" button |
| T3.5 | Archive Particular case | Happy | Archive with closure date |

### Suite 4: Turno de Oficio Lifecycle (T4.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T4.1 | Create Turno case | Happy | Fill name+designation, submit |
| T4.2 | Create Turno - missing designation | Validation | Submit without designation, verify error |
| T4.3 | View Turno case detail | Happy | Navigate, verify designation field |
| T4.4 | Turno list state tabs work | Happy | Click each tab, verify filtering |
| T4.5 | Archive Turno case | Happy | Archive with closure date |

### Suite 5: Facturación ARAG (T5.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T5.1 | Facturación list shows ARAG cases | Happy | Navigate to #/invoicing, verify cases listed |
| T5.2 | Minuta amounts are correct | Happy | Verify 203€ + 42.63€ IVA = 245.63€ |
| T5.3 | Generate Minuta (Generar y Enviar) | Happy | Click button, verify PDF generated + email sent |
| T5.4 | Timeline updates after minuta | Happy | Verify document and email appear in timeline |
| T5.5 | Download generated document | Happy | Click document in timeline, verify PDF opens |
| T5.6 | Suplido - no district selected | Validation | Click "Generar Suplido" without district |
| T5.7 | Suplido - select district, verify amount | Happy | Select Torrox (20€), verify amount updates |
| T5.8 | Generate Suplido | Happy | Select district, generate, verify timeline |
| T5.9 | Email retry on failed email | Edge | If any ERROR email, click retry |
| T5.10 | Archive from Facturación page | Happy | Use archive section, set date, verify |

### Suite 6: Configuration & Admin (T6.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T6.1 | Config page loads all values | Happy | Navigate, verify all fields populated |
| T6.2 | SMTP test connection | Happy | Click "Probar Conexión" |
| T6.3 | Certificate test | Happy | Click "Probar Certificado" |
| T6.4 | Admin table browser | Happy | Click table name, verify data loads |
| T6.5 | Admin SQL query | Happy | Execute SELECT query, verify results |
| T6.6 | Admin rejects non-SELECT | Edge | Try INSERT/UPDATE, verify rejection |

### Suite 7: Case Detail Documents Panel (T7.x)
| ID | Test | Type | Steps |
|----|------|------|-------|
| T7.1 | Case with documents shows list | Happy | Navigate to case with docs, verify items |
| T7.2 | Document type badges shown | Happy | Verify MINUTA/SUPLIDO badges with correct colors |
| T7.3 | Signed badge shown | Happy | Verify "Firmado" green badge on signed docs |
| T7.4 | Click document downloads PDF | Happy | Click doc, verify new tab opens with PDF |
| T7.5 | Case without docs shows empty state | Happy | Navigate to new case, verify "No hay documentos" |
| T7.6 | Correos Enviados card removed | Happy | Verify no "Correos Enviados" section |

**NOTE:** Suite 7 requires VPS deployment of commit 6bc321f first.

---

## Execution Priority
1. Suites 1-4 (core functionality, no side effects)
2. Suite 6 (config/admin, read-only tests)
3. Suite 5 (facturación - creates real documents, uses test email)
4. Suite 7 (requires deployment)

## Test Email Policy
- NEVER use production email: facturacionsiniestros@arag.es
- Current config uses: soniadeveloper1@gmail.com (safe test address)
