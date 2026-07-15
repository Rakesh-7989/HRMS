import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input, Textarea } from '@/components/ui/Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('disables input when disabled prop is set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies error styles', () => {
    const { container } = render(<Input error />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-error-500');
  });

  it('renders helper text', () => {
    render(<Input helperText="Enter your email address" />);
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('does not render helper text when error is true', () => {
    render(<Input helperText="Help text" error />);
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });

  it('renders left icon', () => {
    const { container } = render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />);
    expect(container.querySelector('[data-testid="left-icon"]')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    const { container } = render(<Input rightIcon={<span data-testid="right-icon">✕</span>} />);
    expect(container.querySelector('[data-testid="right-icon"]')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Input className="custom-class" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('custom-class');
  });

  it('uses custom id over label-based id', () => {
    render(<Input label="Email" id="custom-id" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'custom-id');
  });
});

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('renders with default rows', () => {
    const { container } = render(<Textarea />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveAttribute('rows', '4');
  });

  it('renders with custom rows', () => {
    const { container } = render(<Textarea rows={8} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveAttribute('rows', '8');
  });

  it('disables textarea when disabled prop is set', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders helper text', () => {
    render(<Textarea helperText="Describe your issue" />);
    expect(screen.getByText('Describe your issue')).toBeInTheDocument();
  });

  it('applies error styles', () => {
    const { container } = render(<Textarea error />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-error-500');
  });
});
