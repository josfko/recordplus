/**
 * ARAG Validation Service
 * Validation functions for ARAG case automation
 */

// Valid judicial districts for suplidos
export const VALID_JUDICIAL_DISTRICTS = [
  "Torrox",
  "Vélez-Málaga",
  "Torremolinos",
  "Fuengirola",
  "Marbella",
  "Estepona",
  "Antequera",
];

/**
 * Validate ARAG external reference format (DJ00xxxxxx)
 * Property 1: ARAG Reference Format Validation
 * @param {string} ref - Reference to validate
 * @returns {boolean} True if valid format
 */
export function validateAragReference(ref) {
  if (typeof ref !== "string") return false;
  return /^DJ00\d{6}$/.test(ref);
}

/**
 * Validate partido judicial
 * Property 14: Partido Judicial Validation
 * @param {string} district - District to validate
 * @returns {boolean} True if valid district
 */
export function isValidJudicialDistrict(district) {
  if (typeof district !== "string") return false;
  return VALID_JUDICIAL_DISTRICTS.includes(district);
}

/**
 * Validate mileage rate (must be positive number)
 * Property 17: Mileage Rate Validation
 * @param {number|string} rate - Rate to validate
 * @returns {boolean} True if valid rate
 */
export function isValidMileageRate(rate) {
  const numRate = typeof rate === "string" ? parseFloat(rate) : rate;
  if (typeof numRate !== "number" || isNaN(numRate)) return false;
  return numRate >= 0;
}

/**
 * Calculate minuta amounts
 * Property 5: Minuta Amount Calculation
 * @param {number} baseFee - Base fee amount
 * @param {number} vatRate - VAT rate percentage
 * @returns {Object} { baseFee, vatAmount, total }
 */
export function calculateMinutaAmounts(baseFee, vatRate) {
  const base = parseFloat(baseFee) || 0;
  const rate = parseFloat(vatRate) || 0;
  const vatAmount = base * (rate / 100);
  const total = base + vatAmount;

  return {
    baseFee: Math.round(base * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Get mileage rate for a district from config
 * @param {Object} config - Configuration object
 * @param {string} district - Judicial district
 * @returns {number} Mileage rate
 */
export function getMileageRate(config, district) {
  if (!isValidJudicialDistrict(district)) return 0;
  const key = `mileage_${district.toLowerCase().replace(/[^a-z]/g, "_")}`;
  return parseFloat(config[key]) || 0;
}

/**
 * Get configuration key for a district
 * @param {string} district - Judicial district
 * @returns {string} Configuration key
 */
export function getDistrictConfigKey(district) {
  return `mileage_${district.toLowerCase().replace(/[^a-z]/g, "_")}`;
}

/**
 * Check if a case can generate documents (minuta/suplido)
 * Property 19: Archived Case Document Restriction
 * @param {Object} caseData - Case data object
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export function canGenerateDocuments(caseData) {
  if (!caseData || typeof caseData !== "object") {
    return { allowed: false, reason: "Datos de expediente inválidos" };
  }

  if (caseData.state === "ARCHIVADO") {
    return {
      allowed: false,
      reason: "No se pueden generar documentos en expedientes archivados",
    };
  }

  if (caseData.type !== "ARAG") {
    return {
      allowed: false,
      reason: "Solo expedientes ARAG pueden generar documentos",
    };
  }

  return { allowed: true };
}

/**
 * Check if a case can generate suplido
 * Property 13: Suplido State Restriction
 * @param {Object} caseData - Case data object
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export function canGenerateSuplido(caseData) {
  // First check general document restrictions
  const docCheck = canGenerateDocuments(caseData);
  if (!docCheck.allowed) {
    return docCheck;
  }

  if (caseData.state !== "JUDICIAL") {
    return {
      allowed: false,
      reason: "Solo expedientes judiciales pueden generar suplidos",
    };
  }

  return { allowed: true };
}
