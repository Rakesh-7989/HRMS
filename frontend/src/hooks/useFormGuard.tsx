import { useBlocker } from 'react-router-dom';

export const useFormGuard = (isDirty: boolean) => {
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    return blocker;
};
