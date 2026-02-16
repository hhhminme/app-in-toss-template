import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Welcome } from './Welcome';

describe('Welcome', () => {
  it('renders welcome title', () => {
    render(<Welcome />);
    expect(screen.getByText('앱인토스 템플릿')).toBeInTheDocument();
  });

  it('renders feature descriptions', () => {
    render(<Welcome />);
    expect(screen.getByText('⚡️ 빠른 개발')).toBeInTheDocument();
    expect(screen.getByText('🎨 TDS 디자인')).toBeInTheDocument();
    expect(screen.getByText('🔷 타입 안정성')).toBeInTheDocument();
  });

  it('calls onGetStarted when button is clicked', () => {
    const handleGetStarted = vi.fn();
    render(<Welcome onGetStarted={handleGetStarted} />);

    const button = screen.getByRole('button', { name: '시작하기' });
    fireEvent.click(button);

    expect(handleGetStarted).toHaveBeenCalledTimes(1);
  });

  it('does not render button when onGetStarted is not provided', () => {
    render(<Welcome />);
    const button = screen.queryByRole('button', { name: '시작하기' });
    expect(button).not.toBeInTheDocument();
  });
});
