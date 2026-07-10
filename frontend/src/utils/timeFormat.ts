/**
 * Time formatting utilities for consistent time display across the application
 */

/**
 * Convert 24-hour time string (HH:mm:ss or HH:mm) to 12-hour format with AM/PM
 * @param time - Time string in HH:mm:ss or HH:mm format
 * @param timezone - Optional IANA timezone string
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export const formatTime12Hour = (time: string | null | undefined, timezone?: string): string => {
    if (!time) return '--:--';

    try {
        // Check if it's a full ISO string or Date string
        if (time.includes('T') || time.includes('-') || time.includes('/')) {
            const date = new Date(time);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: timezone || undefined
                });
            }
        }

        // Handle HH:mm:ss and HH:mm formats (legacy behavior)
        const parts = time.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1]; // Keep minutes as string to preserve '00'

        if (isNaN(hours)) return '--:--';

        // Extract first 2 digits of minutes just in case
        const mins = minutes ? minutes.substring(0, 2) : '00';

        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // Handle midnight (0 -> 12)

        return `${hours}:${mins} ${ampm}`;
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

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

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
 * @param timezone - Optional IANA timezone string
 * @returns Current time string
 */
export const getCurrentTime = (timezone?: string): string => {
    if (timezone) {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date());
    }
    return new Date().toTimeString().slice(0, 8);
};

/**
 * Get current date in YYYY-MM-DD format
 * @param timezone - Optional IANA timezone string
 * @returns Current date string
 */
export const getCurrentDate = (timezone?: string): string => {
    if (timezone) {
        const d = new Date();
        const year = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(d);
        const month = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: '2-digit' }).format(d);
        const day = new Intl.DateTimeFormat('en-US', { timeZone: timezone, day: '2-digit' }).format(d);
        return `${year}-${month}-${day}`;
    }
    return new Date().toISOString().slice(0, 10);
};

/**
 * Get greeting based on time of day in a specific timezone
 * @param timezone - Optional IANA timezone string
 * @returns Greeting string
 */
export const getGreeting = (timezone?: string): string => {
    let hour: number;
    if (timezone) {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false
        }).format(new Date());
        hour = parseInt(hourStr, 10);
    } else {
        hour = new Date().getHours();
    }

    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};

/**
 * Format a date object or ISO string in a specific timezone with a simple template
 * @param date - Date object or ISO string
 * @param timezone - Optional IANA timezone string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted string
 */
export const formatInTimezone = (
    date: Date | string,
    timezone?: string,
    options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '--:--';

    return new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZone: timezone || undefined
    }).format(d);
};
