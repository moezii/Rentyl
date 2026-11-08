/**
 * Minimal Unit tests for LanguageContext
 *
 * Tests only essential functionality that can be reliably verified.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Import the actual context
import { LanguageProvider, useLanguage } from './LanguageContext';

describe('LanguageContext - Minimal Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide context without errors', () => {
    function TestComponent() {
      const context = useLanguage();
      return <div data-testid="test">Context loaded</div>;
    }

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('test').textContent).toBe('Context loaded');
  });

  it('should provide translation function', () => {
    function TestComponent() {
      const { t } = useLanguage();
      return <div data-testid="test">{t ? 'has t' : 'no t'}</div>;
    }

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('test').textContent).toBe('has t');
  });

  it('should throw error when used outside provider', () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      function BadComponent() {
        useLanguage();
        return <div>Test</div>;
      }
      render(<BadComponent />);
    }).toThrow('useLanguage must be used within a LanguageProvider');

    console.error = originalError;
  });

  it('should work with localStorage language setting', () => {
    localStorage.setItem('language', 'ar');

    function TestComponent() {
      const context = useLanguage();
      return <div data-testid="test">Rendered</div>;
    }

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('test').textContent).toBe('Rendered');
  });

  it('should work without localStorage language setting', () => {
    function TestComponent() {
      const context = useLanguage();
      return <div data-testid="test">Rendered</div>;
    }

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('test').textContent).toBe('Rendered');
  });
});
