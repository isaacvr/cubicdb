import { describe, expect, it } from 'vitest';
import { createEmptySession } from './object';

describe('createEmptySession', () => {
  it('stores inspection duration in seconds like persisted session settings', () => {
    expect(createEmptySession().settings.inspection).toBe(15);
  });
});
