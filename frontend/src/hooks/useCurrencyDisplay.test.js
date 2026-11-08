/**
 * Unit tests for useCurrencyDisplay Hook
 *
 * Tests currency formatting, conversion, and display utilities.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurrencyDisplay } from './useCurrencyDisplay';
import * as CurrencyContext from '../components/context/CurrencyContext';

// Mock the CurrencyContext
vi.mock('../components/context/CurrencyContext', () => ({
  useCurrency: vi.fn(),
}));

describe('useCurrencyDisplay Hook', () => {
  const mockConvertFromUSD = vi.fn(amount => amount * 0.385); // Mock USD to OMR conversion
  const mockFormatAmount = vi.fn(amount => `ر.ع. ${amount.toFixed(2)}`);
  const mockGetCurrentCurrency = vi.fn(() => ({
    code: 'OMR',
    symbol: 'ر.ع.',
    name: 'Omani Rial',
  }));

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Reset mockGetCurrentCurrency to default
    mockGetCurrentCurrency.mockReturnValue({
      code: 'OMR',
      symbol: 'ر.ع.',
      name: 'Omani Rial',
    });

    // Setup default mock implementation
    vi.mocked(CurrencyContext.useCurrency).mockReturnValue({
      convertFromUSD: mockConvertFromUSD,
      formatAmount: mockFormatAmount,
      selectedCurrency: 'OMR',
      getCurrentCurrency: mockGetCurrentCurrency,
    });
  });

  describe('formatPrice', () => {
    it('should format USD amount to selected currency', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPrice(100);

      expect(mockConvertFromUSD).toHaveBeenCalledWith(100);
      expect(mockFormatAmount).toHaveBeenCalled();
      expect(formatted).toBe('ر.ع. 38.50');
    });

    it('should handle zero amount', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPrice(0);

      expect(mockConvertFromUSD).toHaveBeenCalledWith(0);
      expect(formatted).toBe('ر.ع. 0.00');
    });

    it('should return empty string for null', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPrice(null);

      expect(formatted).toBe('');
      expect(mockConvertFromUSD).not.toHaveBeenCalled();
    });

    it('should return empty string for undefined', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPrice(undefined);

      expect(formatted).toBe('');
      expect(mockConvertFromUSD).not.toHaveBeenCalled();
    });

    it('should handle large amounts', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPrice(10000);

      expect(mockConvertFromUSD).toHaveBeenCalledWith(10000);
      expect(mockFormatAmount).toHaveBeenCalled();
    });

    it('should handle decimal amounts', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPrice(99.99);

      expect(mockConvertFromUSD).toHaveBeenCalledWith(99.99);
      expect(mockFormatAmount).toHaveBeenCalled();
    });
  });

  describe('formatPriceNumber', () => {
    it('should format amount as number without symbol', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPriceNumber(100);

      expect(mockConvertFromUSD).toHaveBeenCalledWith(100);
      expect(formatted).toBe('38.50');
    });

    it('should return number with 2 decimal places', () => {
      mockConvertFromUSD.mockReturnValue(38.5);
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPriceNumber(100);

      expect(formatted).toBe('38.50');
    });

    it('should handle zero', () => {
      mockConvertFromUSD.mockReturnValue(0);
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPriceNumber(0);

      expect(formatted).toBe('0.00');
    });

    it('should return empty string for null', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPriceNumber(null);

      expect(formatted).toBe('');
    });

    it('should return empty string for undefined', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const formatted = result.current.formatPriceNumber(undefined);

      expect(formatted).toBe('');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return currency symbol from current currency', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const symbol = result.current.getCurrencySymbol();

      expect(mockGetCurrentCurrency).toHaveBeenCalled();
      expect(symbol).toBe('ر.ع.');
    });

    it('should return default $ symbol if currency not found', () => {
      mockGetCurrentCurrency.mockReturnValue(null);
      const { result } = renderHook(() => useCurrencyDisplay());

      const symbol = result.current.getCurrencySymbol();

      expect(symbol).toBe('$');
    });

    it('should return default $ symbol if symbol not in currency object', () => {
      mockGetCurrentCurrency.mockReturnValue({ code: 'XXX', name: 'Unknown' });
      const { result } = renderHook(() => useCurrencyDisplay());

      const symbol = result.current.getCurrencySymbol();

      expect(symbol).toBe('$');
    });
  });

  describe('selectedCurrency', () => {
    it('should return selected currency code', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      expect(result.current.selectedCurrency).toBe('OMR');
    });

    it('should update when currency changes', () => {
      const { result, rerender } = renderHook(() => useCurrencyDisplay());

      expect(result.current.selectedCurrency).toBe('OMR');

      // Change mock to return different currency
      vi.mocked(CurrencyContext.useCurrency).mockReturnValue({
        convertFromUSD: mockConvertFromUSD,
        formatAmount: mockFormatAmount,
        selectedCurrency: 'USD',
        getCurrentCurrency: () => ({ code: 'USD', symbol: '$' }),
      });

      rerender();

      expect(result.current.selectedCurrency).toBe('USD');
    });
  });

  describe('getCurrentCurrency', () => {
    it('should return current currency object', () => {
      const { result } = renderHook(() => useCurrencyDisplay());

      const currency = result.current.getCurrentCurrency();

      expect(currency).toEqual({
        code: 'OMR',
        symbol: 'ر.ع.',
        name: 'Omani Rial',
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work with USD currency', () => {
      mockConvertFromUSD.mockImplementation(amount => amount); // No conversion for USD
      mockFormatAmount.mockImplementation(amount => `$${amount.toFixed(2)}`);
      mockGetCurrentCurrency.mockReturnValue({ code: 'USD', symbol: '$' });

      vi.mocked(CurrencyContext.useCurrency).mockReturnValue({
        convertFromUSD: mockConvertFromUSD,
        formatAmount: mockFormatAmount,
        selectedCurrency: 'USD',
        getCurrentCurrency: mockGetCurrentCurrency,
      });

      const { result } = renderHook(() => useCurrencyDisplay());

      expect(result.current.formatPrice(100)).toBe('$100.00');
      expect(result.current.formatPriceNumber(100)).toBe('100.00');
      expect(result.current.getCurrencySymbol()).toBe('$');
    });

    it('should work with EUR currency', () => {
      mockConvertFromUSD.mockImplementation(amount => amount * 0.92);
      mockFormatAmount.mockImplementation(amount => `€${amount.toFixed(2)}`);
      mockGetCurrentCurrency.mockReturnValue({ code: 'EUR', symbol: '€' });

      vi.mocked(CurrencyContext.useCurrency).mockReturnValue({
        convertFromUSD: mockConvertFromUSD,
        formatAmount: mockFormatAmount,
        selectedCurrency: 'EUR',
        getCurrentCurrency: mockGetCurrentCurrency,
      });

      const { result } = renderHook(() => useCurrencyDisplay());

      expect(result.current.formatPrice(100)).toBe('€92.00');
      expect(result.current.getCurrencySymbol()).toBe('€');
    });
  });
});
