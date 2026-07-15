import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="There are no records to display" />);
    expect(screen.getByText('There are no records to display')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Add New</button>} />);
    expect(screen.getByText('Add New')).toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders custom icon', () => {
    const { container } = render(
      <EmptyState title="Empty" icon={<span data-testid="custom-icon">📦</span>} />
    );
    expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument();
  });

  it('renders default icon when no icon provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies compact padding', () => {
    const { container } = render(<EmptyState title="Empty" compact />);
    const div = container.firstChild;
    expect(div).toHaveClass('py-8');
    expect(div).not.toHaveClass('py-16');
  });

  it('applies default (non-compact) padding', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const div = container.firstChild;
    expect(div).toHaveClass('py-16');
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
