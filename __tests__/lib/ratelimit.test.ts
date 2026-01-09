/**
 * @jest-environment node
 */
import { rateLimit, getClientIp } from '@/lib/ratelimit';

describe('rateLimit', () => {
  it('should allow requests within limit', async () => {
    const identifier = 'test-user-1';
    const result = await rateLimit(identifier, { requests: 5, window: 60000 });

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('should block requests exceeding limit', async () => {
    const identifier = 'test-user-2';
    
    // Make 5 requests (limit)
    for (let i = 0; i < 5; i++) {
      await rateLimit(identifier, { requests: 5, window: 60000 });
    }

    // 6th request should be blocked
    const result = await rateLimit(identifier, { requests: 5, window: 60000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    const identifier = 'test-user-3';
    
    // First request
    const result1 = await rateLimit(identifier, { requests: 1, window: 100 });
    expect(result1.success).toBe(true);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should allow new request
    const result2 = await rateLimit(identifier, { requests: 1, window: 100 });
    expect(result2.success).toBe(true);
  });
});

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
    });

    const ip = getClientIp(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers({
      'x-real-ip': '192.168.1.2',
    });

    const ip = getClientIp(headers);
    expect(ip).toBe('192.168.1.2');
  });

  it('should return anonymous if no IP headers', () => {
    const headers = new Headers();
    const ip = getClientIp(headers);
    expect(ip).toBe('anonymous');
  });
});
