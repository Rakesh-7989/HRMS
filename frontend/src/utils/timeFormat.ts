/**
 * Time formatting utilities for consistent time display across the application
 */

/**
 * Convert 24-hour time string (HH:mm:ss or HH:mm) to 12-hour format with AM/PM
 * @param time - Time string in HH:mm:ss or HH:mm format
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export const formatTime12Hour = (time: string | null | undefined): string => {
    if (!time) return '--:--';

    try {
        // Handle both HH:mm:ss and HH:mm formats
        const parts = time.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];

        if (isNaN(hours)) return '--:--';

        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // Handle midnight (0 -> 12)

        return `${hours}:${minutes} ${ampm}`;
    } catch {
        return '--:--';
    }
};

/**
 * Format a duration in seconds to HH:MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "08:45:23")
 */
export const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format a duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "8h 45m")
 */
export const formatDurationHumanReadable = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0h 0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
        return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
};

/**
 * Calculate work duration between two time strings
 * @param checkIn - Check-in time in HH:mm:ss format
 * @param checkOut - Check-out time in HH:mm:ss format
 * @returns Duration string (e.g., "8.5h") or '-' if invalid
 */
export const calculateWorkDuration = (checkIn: string | null | undefined, checkOut: string | null | undefined): string => {
    if (!checkIn || !checkOut) return '-';

    try {
        const checkInDate = new Date(`1970-01-01T${checkIn}`);
        const checkOutDate = new Date(`1970-01-01T${checkOut}`);

        // Handle overnight shifts
        let diffMs = checkOutDate.getTime() - checkInDate.getTime();
        if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
        }

        const diffHours = diffMs / (1000 * 60 * 60);
        return `${diffHours.toFixed(1)}h`;
    } catch {
        return '-';
    }
};

/**
 * Get current time in HH:mm:ss format
 * @returns Current time string
 */
export const getCurrentTime = (): string => {
    return new Date().toTimeString().slice(0, 8);
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns Current date string
 */
export const getCurrentDate = (): string => {
    return new Date().toISOString().slice(0, 10);
};
