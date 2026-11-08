import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./secureApi', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import secureApi from './secureApi';
import { appendQueryParam, buildIntegrityParams, confirmPayment } from './amwalPayment';

const paymentData = {
  amount: '21.000',
  currencyId: 512,
  customerId: 'c-1',
  customerTokenId: '',
  merchantId: '123456',
  merchantReference: 'RENTYL_1_abc',
  responseCode: '00',
  terminalId: '654321',
  transactionId: 'txn-1',
  transactionTime: '2030-01-01T10:00:00Z',
  secureHashValue: 'ABCDEF',
  cardNumber: '4111********1111',
};

describe('appendQueryParam', () => {
  it('adds a parameter with the right separator and encoding', () => {
    expect(appendQueryParam('/api/payment/return', 'intent', 'a.b')).toBe('/api/payment/return?intent=a.b');
    expect(appendQueryParam('/r?carId=x', 'intent', 'a+b/c')).toBe('/r?carId=x&intent=a%2Bb%2Fc');
  });

  it('leaves the URL unchanged without a value', () => {
    expect(appendQueryParam('/r?carId=x', 'intent', null)).toBe('/r?carId=x');
    expect(appendQueryParam('', 'intent', 'v')).toBe('');
  });
});

describe('buildIntegrityParams', () => {
  it('keeps only the hashed fields and the amount string as sent', () => {
    const params = buildIntegrityParams(paymentData);
    expect(params.amount).toBe('21.000');
    expect(params).not.toHaveProperty('cardNumber');
    expect(params).not.toHaveProperty('secureHashValue');
    expect(Object.keys(params)).toHaveLength(10);
  });
});

describe('confirmPayment', () => {
  beforeEach(() => {
    secureApi.post.mockReset();
  });

  it('sends the AMWAL response and intent and returns the payment token', async () => {
    secureApi.post.mockResolvedValue({ data: { paymentToken: 'signed.token' } });

    const token = await confirmPayment({ data: { data: paymentData } }, 'intent.token');

    expect(token).toBe('signed.token');
    expect(secureApi.post).toHaveBeenCalledWith('/payment/confirm', {
      params: buildIntegrityParams(paymentData),
      receivedHash: 'ABCDEF',
      paymentIntent: 'intent.token',
    });
  });

  it('returns null when verification fails', async () => {
    secureApi.post.mockRejectedValue(new Error('400'));
    expect(await confirmPayment({ data: { data: paymentData } }, 'intent.token')).toBeNull();
  });

  it('returns null without response data or intent', async () => {
    expect(await confirmPayment({}, 'intent.token')).toBeNull();
    expect(await confirmPayment({ data: { data: paymentData } }, null)).toBeNull();
    expect(secureApi.post).not.toHaveBeenCalled();
  });
});
