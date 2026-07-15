import React from 'react';
import { render } from '@testing-library/react';

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui);
}
