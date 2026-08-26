import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health';

describe('HealthResponseSchema', () => {
  it('accepts the operational health response', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('rejects a response without a healthy status', () => {
    expect(HealthResponseSchema.safeParse({})).toMatchObject({ success: false });
  });
});
