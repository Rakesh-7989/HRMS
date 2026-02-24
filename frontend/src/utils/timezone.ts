import { useQuery } from '@tanstack/react-query';

export interface TimezoneOption {
    label: string;
    value: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
    { label: '(UTC-08:00) Pacific Time', value: 'America/Los_Angeles' },
    { label: '(UTC-07:00) Mountain Time', value: 'America/Denver' },
    { label: '(UTC-06:00) Central Time', value: 'America/Chicago' },
    { label: '(UTC-05:00) Eastern Time', value: 'America/New_York' },
    { label: '(UTC+00:00) UTC / Greenwich Mean Time', value: 'UTC' },
    { label: '(UTC+00:00) London, Dublin, Lisbon', value: 'Europe/London' },
    { label: '(UTC+01:00) Berlin, Paris, Rome, Madrid', value: 'Europe/Berlin' },
    { label: '(UTC+02:00) Cairo, Johannesburg, Helsinki', value: 'Africa/Cairo' },
    { label: '(UTC+03:00) Moscow, Riyadh, Nairobi', value: 'Europe/Moscow' },
    { label: '(UTC+04:00) Dubai, Abu Dhabi, Muscat', value: 'Asia/Dubai' },
    { label: '(UTC+05:00) Karachi, Tashkent', value: 'Asia/Karachi' },
    { label: '(UTC+05:30) India, Sri Lanka', value: 'Asia/Kolkata' },
    { label: '(UTC+06:00) Dhaka, Almaty', value: 'Asia/Dhaka' },
    { label: '(UTC+07:00) Bangkok, Jakarta, Hanoi', value: 'Asia/Bangkok' },
    { label: '(UTC+08:00) Beijing, Singapore, Perth', value: 'Asia/Shanghai' },
    { label: '(UTC+09:00) Tokyo, Seoul, Osaka', value: 'Asia/Tokyo' },
    { label: '(UTC+10:00) Sydney, Melbourne, Brisbane', value: 'Australia/Sydney' },
    { label: '(UTC+12:00) Auckland, Fiji', value: 'Pacific/Auckland' },
];

/**
 * Generates an exhaustive list of timezones using native browser APIs as a robust fallback.
 */
export const getLocalExhaustiveTimezones = (): TimezoneOption[] => {
    const ianaNames = (Intl as any).supportedValuesOf
        ? (Intl as any).supportedValuesOf('timeZone')
        : [];

    const date = new Date();

    return ianaNames.map((name: string) => {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: name,
                timeZoneName: 'shortOffset'
            });
            const parts = formatter.formatToParts(date);
            const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC';
            const labelStr = offset.replace('GMT', 'UTC');

            return {
                label: `(${labelStr === 'UTC' ? 'UTC+00:00' : labelStr}) ${name.replace(/_/g, ' ')}`,
                value: name
            };
        } catch (e) {
            return { label: name, value: name };
        }
    });
};

let globalCachedTimezones: TimezoneOption[] = [...COMMON_TIMEZONES];

/**
 * Fetches timezones from our backend proxy API.
 */
export const fetchExternalTimezones = async (): Promise<TimezoneOption[]> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/common/timezones`);

        if (!response.ok) {
            throw new Error('Backend timezone proxy failed');
        }

        const data = await response.json();

        if (data.status === 'OK' && Array.isArray(data.zones)) {
            const externalTimezones: TimezoneOption[] = data.zones.map((tz: any) => ({
                label: `(UTC${tz.gmtOffsetName.replace('UTC', '')}) ${tz.zoneName.replace(/_/g, ' ')}`,
                value: tz.zoneName
            }));

            // Merge and cache
            const merged = [...COMMON_TIMEZONES];
            externalTimezones.forEach(tz => {
                if (!merged.some(m => m.value === tz.value)) {
                    merged.push(tz);
                }
            });
            globalCachedTimezones = merged;
            return globalCachedTimezones;
        }

        throw new Error('Invalid data format from proxy');
    } catch (error) {
        console.error('Error fetching timezones from backend proxy:', error);

        // Fallback to local exhaustive list
        const local = getLocalExhaustiveTimezones();
        const merged = [...COMMON_TIMEZONES];
        local.forEach(tz => {
            if (!merged.some(m => m.value === tz.value)) {
                merged.push(tz);
            }
        });
        globalCachedTimezones = merged;
        return globalCachedTimezones;
    }
};

/**
 * Reactive hook for components to get the latest timezones.
 */
export const useTimezones = () => {
    const { data: timezones = globalCachedTimezones, isLoading } = useQuery({
        queryKey: ['timezones'],
        queryFn: fetchExternalTimezones,
        staleTime: Infinity,
        gcTime: Infinity,
    });

    return { timezones, isLoading };
};

export const getAllTimezones = () => globalCachedTimezones;

export const getTimezoneLabel = (value?: string) => {
    if (!value) return 'Not set';
    const found = globalCachedTimezones.find(tz => tz.value === value);
    if (found) return found.label;

    // Attempt dynamic format if not in registry
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: value,
            timeZoneName: 'shortOffset'
        });
        const parts = formatter.formatToParts(new Date());
        const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC';
        const labelStr = offset.replace('GMT', 'UTC');
        return `(${labelStr === 'UTC' ? 'UTC+00:00' : labelStr}) ${value.replace(/_/g, ' ')}`;
    } catch (e) {
        return value;
    }
};
