/**
 * Detects the device type based on user agent and screen width
 */
export const detectDeviceType = (): 'Mobile' | 'Tablet' | 'Desktop' => {
    const ua = navigator.userAgent;

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'Tablet';
    }

    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'Mobile';
    }

    // Fallback to screen width check for responsive desktop browsers
    if (window.innerWidth <= 768) {
        return 'Mobile';
    }

    if (window.innerWidth <= 1024) {
        return 'Tablet';
    }

    return 'Desktop';
};

/**
 * Gets a more detailed string about the browser and OS
 */
export const getBrowserInfo = (): string => {
    const ua = navigator.userAgent;
    let browser = "Unknown";

    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    else if (ua.indexOf("Edge") > -1) browser = "Edge";
    else if (ua.indexOf("MSIE") > -1 || !!(document as unknown as { documentMode?: boolean }).documentMode) browser = "IE";

    return `${browser} on ${navigator.platform}`;
};
