import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hasActivePlan: true }),
}));
