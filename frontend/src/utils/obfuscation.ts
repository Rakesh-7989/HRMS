/**
 * Utility for URL ID obfuscation (not real encryption, but looks "secure" to users)
 * Prevents easy enumeration and masks the internal database structure.
 */

const SALT = "GIGGLE_ZEN_2026"; // Internal salt

/**
 * Obfuscates a UUID or string ID into a "secure-looking" Base64-like string.
 */
export const obfuscateId = (id: string): string => {
  if (!id) return '';
  // Simple reversible transformation: reverse string + prepend salt + base64
  const payload = `${SALT}:${id.split('').reverse().join('')}`;
  return btoa(payload)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // URL safe base64
};

/**
 * De-obfuscates a masked string back into the original ID.
 */
export const deobfuscateId = (masked: string): string => {
  if (!masked) return '';
  try {
    // Add back padding
    let base64 = masked.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    const decoded = atob(base64);
    const [salt, reversedId] = decoded.split(':');
    
    if (salt !== SALT) return masked; // Not ours, return as is (maybe it's a raw UUID)
    
    return reversedId.split('').reverse().join('');
  } catch {
    return masked; // Fallback to raw value
  }
};
