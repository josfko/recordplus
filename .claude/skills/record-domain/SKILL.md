---
name: record-domain
description: Spanish legal terminology and business rules for Record+ case management. Use when working with case types (ARAG, Particular, Turno de Oficio), reference formats, state transitions, document generation, or any domain-specific logic. Triggers on legal terms, case workflows, or business rule questions.
---

# Record+ Domain Knowledge

## Case Types (Tipos de Expediente)

| Type | Spanish | Description | Has Invoice |
|------|---------|-------------|-------------|
| `ARAG` | ARAG | Insurance legal expense cases | Yes (Minuta + Suplido) |
| `PARTICULAR` | Particular | Private client cases | Yes (Hoja de Encargo) |
| `TURNO_OFICIO` | Turno de Oficio | Public defender assignments | No |

## Terminology (Terminología)

| Spanish | English | Context |
|---------|---------|---------|
| Expediente | Case file | A legal case record |
| Minuta | Invoice | ARAG fee invoice (203€ + IVA) |
| Suplido | Expense | Mileage reimbursement document |
| Hoja de Encargo | Engagement letter | Private client agreement |
| Partido Judicial | Court district | For mileage calculations |
| Designación | Designation | Public defender assignment number |
| Abierto | Open | Active case state |
| Judicial | In court | Case in judicial proceedings |
| Archivado | Archived | Closed case state |
| Fecha de Entrada | Entry date | When case was opened |
| Fecha de Cierre | Closure date | When case was archived |

## Reference Formats

### ARAG Cases
- **Internal:** `IY` + 6 digits → `IY004921`
- **External:** `DJ00` + 6 digits → `DJ00948211`
- External reference provided by ARAG, internal auto-generated

### Particular Cases
- **Internal:** `IY-YY-NNN` → `IY-26-001`
- Year resets counter to 001 each January
- No external reference

### Turno de Oficio
- **Designation only:** Free-form text (e.g., `8821/23`)
- No internal reference generated
- No invoices generated

## State Transitions (Estados)

```
ABIERTO ──────────────────────┬──────────► ARCHIVADO
   │                          │               ▲
   │  (ARAG only)             │               │
   ▼                          │               │
JUDICIAL ─────────────────────┴───────────────┘
```

### Rules
- All cases start as `ABIERTO`
- Only ARAG cases can transition to `JUDICIAL`
- `JUDICIAL` requires: judicial date + district
- `ARCHIVADO` requires: closure date
- Archived cases are read-only (except observations)

## Judicial Districts (Partidos Judiciales)

Valid districts for mileage calculations:
- Torrox
- Vélez-Málaga
- Torremolinos
- Fuengirola
- Marbella
- Estepona
- Antequera

## ARAG Billing

### Minuta (Invoice)
- Base fee: **203.00€**
- VAT (IVA): **21%**
- Total: **245.63€**
- Send to: `facturacionsiniestros@arag.es`

### Suplido (Mileage Expense)
- Per-district mileage rates configured in settings
- Calculated based on judicial district
- Separate document from minuta

## Validation Rules

### ARAG Reference
- Pattern: `/^DJ00\d{6}$/`
- Must be unique across all cases
- Example valid: `DJ00123456`
- Example invalid: `DJ001234`, `dj00123456`

### Dates
- Format: `YYYY-MM-DD` (ISO)
- Entry date defaults to today
- Closure date required for archiving

### Client Name
- Required for all case types
- Trimmed of whitespace
- Cannot be empty string

## UI Labels (Spanish)

```javascript
const labels = {
  // Case types
  ARAG: "ARAG",
  PARTICULAR: "Particular",
  TURNO_OFICIO: "Turno de Oficio",

  // States
  ABIERTO: "Abierto",
  JUDICIAL: "Judicial",
  ARCHIVADO: "Archivado",

  // Form fields
  clientName: "Nombre del Cliente",
  aragReference: "Referencia ARAG",
  designation: "Número de Designación",
  entryDate: "Fecha de Entrada",
  closureDate: "Fecha de Cierre",
  judicialDate: "Fecha Paso a Judicial",
  judicialDistrict: "Partido Judicial",
  observations: "Observaciones",
};
```

## Error Messages (Spanish)

```javascript
const errors = {
  requiredClient: "El nombre del cliente es obligatorio",
  requiredAragRef: "La referencia ARAG es obligatoria para expedientes ARAG",
  invalidAragFormat: "Formato de referencia ARAG inválido. Debe ser DJ00 seguido de 6 dígitos",
  requiredDesignation: "El número de designación es obligatorio para expedientes de Turno de Oficio",
  requiredClosureDate: "La fecha de cierre es obligatoria para archivar",
  alreadyArchived: "El expediente ya está archivado",
  archivedReadOnly: "Los expedientes archivados solo permiten editar observaciones",
  onlyAragJudicial: "Solo los expedientes ARAG pueden pasar a estado judicial",
  onlyFromOpen: "Solo se puede pasar a judicial desde estado Abierto",
  duplicateAragRef: "Ya existe un expediente con esta referencia ARAG",
  invalidDateFormat: "Formato de fecha inválido. Use YYYY-MM-DD",
  notFound: "Expediente no encontrado",
};
```
