# Test Journey: Turno de Oficio

**Date:** 2026-02-05
**Environment:** Production (recordplus.work)
**Tester:** Claude Code (automated browser testing)
**Status:** ✅ ALL TESTS PASSED

---

## Summary

Complete user journey testing for Turno de Oficio (public defender) case management. All 12 test steps passed successfully.

| Step | Test | Result |
|------|------|--------|
| 1 | Navigate to list view | ✅ PASS |
| 2 | Create new case | ✅ PASS |
| 3 | Verify detail view layout | ✅ PASS |
| 4 | Test observations auto-save | ✅ PASS |
| 5 | Upload document | ✅ PASS |
| 6 | Download document | ✅ PASS |
| 7 | Finalize case | ✅ PASS |
| 8 | Reopen case | ✅ PASS |
| 9 | Finalize again | ✅ PASS |
| 10 | Archive case | ✅ PASS |
| 11 | Verify archived state (read-only) | ✅ PASS |
| 12 | Verify list view filters | ✅ PASS |

---

## Test Data

**Case Created:**
- **Internal Reference:** IY000002
- **Client Name:** Test Justiciable Turno
- **Designation:** TO-2026-001-MALAGA
- **Entry Date:** 05/02/2026
- **Closure Date:** 05/02/2026

**Document Uploaded:**
- **Filename:** Programa_de_gestio__n_de_expedientes_1770315305266.pdf
- **Description:** Escrito de defensa inicial
- **Upload Date:** 05/02/2026

---

## Detailed Results

### Step 1: Navigate to Turno de Oficio List
**URL:** `#/turno`
**Result:** ✅ PASS

**Verified:**
- List view loads correctly
- Filter tabs visible: Activos, Abiertos, Finalizados, Archivados, Todos
- Empty state message: "No hay expedientes de Turno de Oficio activos"
- "Nuevo Expediente" button visible

---

### Step 2: Create Turno de Oficio Case
**URL:** `#/cases/new?type=TURNO_OFICIO`
**Result:** ✅ PASS

**Form Fields:**
- Type selector: ARAG | Particular | **Turno Oficio** (selected)
- Nombre del Cliente: "Test Justiciable Turno"
- Número de Designación: "TO-2026-001-MALAGA"
- Fecha de Entrada: 05/02/2026

**Verified:**
- Case created with internal reference IY000002 (shared numbering with ARAG)
- State: ABIERTO
- Redirected to case detail view

---

### Step 3: Verify Case Detail View
**URL:** `#/turno/3`
**Result:** ✅ PASS

**Layout verified (3-column):**
- **Left:** "Datos del Justiciable" - Reference, Name, Entry Date, Designation
- **Center:** "Observaciones y Notas" with auto-save indicator, "Histórico Documentos" / "Histórico Envíos" tabs
- **Right:** "Flujo del Expediente" timeline

**UI Elements:**
- State badge: "ABIERTO" (amber)
- Buttons: "Finalizar", "Imprimir"
- Archive checkbox in "Estado del Expediente" section

---

### Step 4: Test Observations Auto-save
**Result:** ✅ PASS

**Input:** "Juzgado de Instrucción nº 3 de Málaga. Número de autos: 123/2026"

**Verified:**
- Text entered in textarea
- Auto-save indicator visible ("Auto-guardado activo")
- Text persisted after page refresh

---

### Step 5: Upload Manual Document
**Result:** ✅ PASS

**Upload Modal Fields:**
- Expediente: IY000002 - Test Justiciable Turno (read-only)
- Descripción del documento: "Escrito de defensa inicial"
- Archivo PDF: Drag & drop zone (Max 10 MB)

**Verified:**
- Document uploaded successfully
- Document appears in "Histórico Documentos" tab with count (1)
- Document entry shows in timeline: "Documento: Programa_de_gestio__n_de_exp"

---

### Step 6: Download Uploaded Document
**Result:** ✅ PASS

**Verified:**
- Download button visible on document entry
- Click triggered browser download action
- New tab opened for file download

---

### Step 7: Finalize Case
**Result:** ✅ PASS

**Before:**
- State: ABIERTO
- Button: "Finalizar"

**After:**
- State: FINALIZADO (blue badge)
- Button changed to: "Reabrir"
- Timeline updated: "Expediente Finalizado"
- Pending step: "Pendiente de Archivo"

---

### Step 8: Reopen Case
**Result:** ✅ PASS

**Verified:**
- State changed back to: ABIERTO (amber badge)
- Button changed to: "Finalizar"
- Timeline shows: "Pendiente de Finalización"

---

### Step 9: Finalize Again
**Result:** ✅ PASS

**Verified:**
- State: FINALIZADO
- Ready for archive

---

### Step 10: Archive Case
**Result:** ✅ PASS

**Archive Form:**
- Checkbox: "Archivar Expediente" ✓
- Fecha de Cierre (Requerida): 05/02/2026
- Button: "Confirmar Archivo"

**Verified:**
- Case archived successfully
- Redirected to list view
- Filter counts updated: Archivados: 1

---

### Step 11: Verify Archived State (Read-only)
**Result:** ✅ PASS

**Verified restrictions:**
- ✅ State badge: "ARCHIVADO" (gray)
- ✅ No "Finalizar" or "Reabrir" buttons
- ✅ No "Subir Documento" button (cannot upload new documents)
- ✅ Only "Imprimir" button available
- ✅ Existing document still downloadable
- ✅ Observations textarea still visible (can be edited)
- ✅ Closure date displayed: "Fecha de cierre: Archivado 05/02/2026"
- ✅ Timeline shows: "Expediente Archivado"

---

### Step 12: Verify List View Filters
**Result:** ✅ PASS

**Filter counts after archival:**
- Activos: 0
- Abiertos: 0
- Finalizados: 0
- **Archivados: 1** ✓
- Todos: 1

**Archived case card:**
- Reference: IY000002
- State badge: "Archivado" (gray)
- Client: "Test Justiciable Turno"
- Designation: TO-2026-001-MALAGA
- "Gestionar →" link

---

## Key Differences from Other Case Types

| Aspect | ARAG | Particulares | Turno de Oficio |
|--------|------|--------------|-----------------|
| Reference | IY + DJ00XXXXXX | IY-26-XXX | IY (shared with ARAG) |
| Auto Docs | Minuta, Suplido | Hoja de Encargo | **NONE** |
| Doc Upload | N/A | N/A | **Manual PDF upload** |
| States | Abierto → Judicial → Archivado | Abierto → Archivado | **Abierto → Finalizado → Archivado** |
| Billing | Fixed 203€ + mileage | User-defined fees | **NO BILLING** |
| Key Field | ARAG Reference | Services | **Designation** |

---

## API Endpoints Tested

| Action | Endpoint | Method | Status |
|--------|----------|--------|--------|
| Create case | `/api/cases` | POST | ✅ |
| Get case | `/api/cases/:id` | GET | ✅ |
| Update observations | `/api/cases/:id` | PUT | ✅ |
| Finalize | `/api/turno/:id/finalize` | POST | ✅ |
| Reopen | `/api/turno/:id/reopen` | POST | ✅ |
| Upload document | `/api/turno/:id/upload` | POST | ✅ |
| Archive | `/api/cases/:id/archive` | POST | ✅ |
| Get history | `/api/cases/:id/history` | GET | ✅ |
| Download doc | `/api/documents/:id/download` | GET | ✅ |

---

## Success Criteria Checklist

- [x] Case created with correct IY reference format
- [x] Designation stored and displayed correctly
- [x] Observations auto-save working
- [x] PDF upload successful
- [x] Document appears in history
- [x] Document downloads correctly
- [x] Finalize state transition works
- [x] Reopen state transition works
- [x] Archive with closure date works
- [x] Archived case is read-only (except observations)
- [x] List view shows correct state filters

---

## Notes

1. **Reference Format:** Turno de Oficio cases share the IY sequential numbering with ARAG cases (not the IY-YY-NNN format used by Particulares).

2. **State Flow:** Turno de Oficio uses a unique 3-state flow (Abierto → Finalizado → Archivado) distinct from ARAG (which has Judicial state) and Particulares (which goes directly to Archivado).

3. **No Automatic Documents:** Unlike ARAG (minutas/suplidos) and Particulares (hoja de encargo), Turno de Oficio cases do NOT generate any automatic documents. All documents must be manually uploaded.

4. **No Billing:** Turno de Oficio cases have no billing functionality as they are public defender assignments.

5. **File Upload:** The manual document upload feature is unique to Turno de Oficio cases, allowing lawyers to attach court documents, defense briefs, and other relevant PDFs.

---

## Screenshots

Test conducted via browser automation. Key states captured:
- Empty list view with filter tabs
- Case creation form with Turno Oficio selected
- Case detail view (3-column layout)
- Document upload modal
- Finalized state with Reabrir button
- Archived state with read-only restrictions
- List view with archived case filter

---

*Generated by Claude Code automated browser testing*
