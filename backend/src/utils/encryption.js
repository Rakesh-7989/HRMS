/**
 * Encryption Utility — AES-256-GCM
 * 
 * Provides encrypt/decrypt for sensitive employee data at rest,
 * plus masking helpers for API responses.
 * 
 * Encrypted format: "iv:authTag:ciphertext" (hex encoded)
 */
const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;    // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

// Parse the 64-char hex key into a 32-byte Buffer
const getKey = () => {
    const key = env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    return Buffer.from(key, 'hex');
};

// ─────────────────── ENCRYPT / DECRYPT ───────────────────

/**
 * Encrypt a plaintext string.
 * @param {string|null} plaintext
 * @returns {string|null} "iv:authTag:ciphertext" or null
 */
function encrypt(plaintext) {
    if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;

    const text = String(plaintext);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 * @param {string|null} encryptedStr  "iv:authTag:ciphertext"
 * @returns {string|null} original plaintext or null
 */
function decrypt(encryptedStr) {
    if (encryptedStr === null || encryptedStr === undefined || encryptedStr === '') return encryptedStr;

    const text = String(encryptedStr);

    // If it doesn't look encrypted (no colons), return as-is (backward compat for un-migrated data)
    if (!text.includes(':')) return text;

    const parts = text.split(':');
    if (parts.length !== 3) return text; // Not our format, return as-is

    try {
        const [ivHex, authTagHex, ciphertext] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        // If decryption fails, the data might be plaintext that happens to contain colons
        // Return as-is rather than crashing
        console.error('Decryption failed (possibly plaintext data):', err.message);
        return text;
    }
}

/**
 * Check if a value looks like it's already encrypted (our format).
 */
function isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 3 && /^[0-9a-f]{32}$/.test(parts[0]) && /^[0-9a-f]{32}$/.test(parts[1]);
}

// ─────────────────── BULK HELPERS ───────────────────

/** List of all sensitive field names */
const SENSITIVE_FIELDS = [
    'aadhar_number',
    'account_number',
    'ifsc_code',
    'tax_id',
    'uan',
    'pf_account',
    'esi_number',
    'phone',
    'emergency_phone'
];

/** Fields in employee_salary_details that are also sensitive */
const SALARY_SENSITIVE_FIELDS = [
    'bank_account_number',  // maps to account_number
    'bank_ifsc'             // maps to ifsc_code
];

/**
 * Encrypt multiple fields on an object (mutates the object).
 * @param {Object} obj - The data object
 * @param {string[]} fields - Field names to encrypt
 * @returns {Object} The same object with encrypted fields
 */
function encryptFields(obj, fields = SENSITIVE_FIELDS) {
    if (!obj) return obj;
    for (const field of fields) {
        if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
            obj[field] = encrypt(obj[field]);
        }
    }
    return obj;
}

/**
 * Decrypt multiple fields on an object (mutates the object).
 * @param {Object} obj - The data object
 * @param {string[]} fields - Field names to decrypt
 * @returns {Object} The same object with decrypted fields
 */
function decryptFields(obj, fields = SENSITIVE_FIELDS) {
    if (!obj) return obj;
    for (const field of fields) {
        if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
            obj[field] = decrypt(obj[field]);
        }
    }
    return obj;
}

// ─────────────────── MASKING ───────────────────

/**
 * Sensitivity tier configuration.
 * Tier 1: Identity — only Self, HR, Admin, SUPER_ADMIN can reveal
 * Tier 2: Financial — only Self, HR, Admin, SUPER_ADMIN can reveal
 * Tier 3: Contact — Self, HR, Admin, SUPER_ADMIN, Manager (direct reports)
 */
const FIELD_CONFIG = {
    aadhar_number: { tier: 1, maskType: 'aadhar' },
    tax_id: { tier: 1, maskType: 'pan' },
    account_number: { tier: 2, maskType: 'account' },
    ifsc_code: { tier: 2, maskType: 'ifsc' },
    uan: { tier: 2, maskType: 'account' },
    pf_account: { tier: 2, maskType: 'account' },
    esi_number: { tier: 2, maskType: 'account' },
    phone: { tier: 3, maskType: 'phone' },
    emergency_phone: { tier: 3, maskType: 'phone' }
};

/**
 * Mask a single value based on its type.
 * @param {string|null} value - The plaintext value
 * @param {string} maskType - Type of masking to apply
 * @returns {string|null}
 */
function maskValue(value, maskType) {
    if (!value || typeof value !== 'string') return value;

    const len = value.length;

    switch (maskType) {
        case 'aadhar':
            // "1234 5678 9012" → "XXXX XXXX 9012"
            if (len >= 4) return 'XXXX XXXX ' + value.slice(-4);
            return 'XXXX';

        case 'pan':
            // "ABCDE1234F" → "XXXXX1234F" (show last 5)
            if (len >= 5) return 'X'.repeat(len - 5) + value.slice(-5);
            return 'XXXX';

        case 'account':
            // "123456789012" → "XXXXXXXX9012" (show last 4)
            if (len >= 4) return 'X'.repeat(len - 4) + value.slice(-4);
            return 'XXXX';

        case 'ifsc':
            // "SBIN0001234" → "XXXX0001234" (show last 7)
            if (len >= 7) return 'X'.repeat(len - 7) + value.slice(-7);
            return 'XXXX';

        case 'phone':
            // "9876543210" → "XXXXXX3210" (show last 4)
            if (len >= 4) return 'X'.repeat(len - 4) + value.slice(-4);
            return 'XXXX';

        default:
            if (len >= 4) return 'X'.repeat(len - 4) + value.slice(-4);
            return 'XXXX';
    }
}

/**
 * Mask all sensitive fields on an object.
 * First decrypts, then masks. Mutates the object.
 * @param {Object} obj - Data object with potentially encrypted values
 * @returns {Object} Object with masked values
 */
function decryptAndMaskFields(obj) {
    if (!obj) return obj;

    for (const [field, config] of Object.entries(FIELD_CONFIG)) {
        if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
            // Decrypt first
            const decrypted = decrypt(obj[field]);
            // Then mask
            obj[field] = maskValue(decrypted, config.maskType);
        }
    }
    return obj;
}

/**
 * Check if a role can reveal a field (tier-based access control).
 * @param {string} role - Actor's role
 * @param {string} fieldName - The field to reveal
 * @param {boolean} isSelf - Whether the actor is viewing their own data
 * @param {boolean} isDirectReport - Whether the target is a direct report of the actor
 * @returns {boolean}
 */
function canRevealField(role, fieldName, isSelf, isDirectReport = false) {
    const config = FIELD_CONFIG[fieldName];
    if (!config) return false;

    // Self can always reveal their own data
    if (isSelf) return true;

    // SUPER_ADMIN, ADMIN, HR can reveal all tiers
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(role)) return true;

    // MANAGER can only reveal Tier 3 (contact info) for direct reports
    if (role === 'MANAGER' && config.tier === 3 && isDirectReport) return true;

    return false;
}

module.exports = {
    encrypt,
    decrypt,
    isEncrypted,
    encryptFields,
    decryptFields,
    maskValue,
    decryptAndMaskFields,
    canRevealField,
    SENSITIVE_FIELDS,
    SALARY_SENSITIVE_FIELDS,
    FIELD_CONFIG
};
