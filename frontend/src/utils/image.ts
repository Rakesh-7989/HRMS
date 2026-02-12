import { BACKEND_URL } from './constants';

/**
 * Resolves a potential relative image path to a full backend URL.
 * If the path is already a full URL or a base64 string, it's returned as is.
 */
export const resolveImageUrl = (path?: string): string | undefined => {
    if (!path) return undefined;

    // If it's a full URL or base64, return as is
    if (path.startsWith('http') || path.startsWith('data:')) {
        return path;
    }

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${BACKEND_URL}${normalizedPath}`;
};
