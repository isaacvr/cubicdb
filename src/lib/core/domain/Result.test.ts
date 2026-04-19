import { describe, it, expect, vi } from 'vitest';
import { Ok, Err, map, flatMap, tap, catchError, getOrElse, getOrThrow, isOk, isErr, combine, tryCatch, fromPromise } from './Result';

describe('Result Type', () => {
  describe('Ok variant', () => {
    it('should create an Ok result', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should discriminate as Ok', () => {
      const result = Ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });
  });

  describe('Err variant', () => {
    it('should create an Err result', () => {
      const result = Err('error');
      expect(result.ok).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBe('error');
      }
    });

    it('should discriminate as Err', () => {
      const result = Err('error');
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('map', () => {
    it('should transform Ok value', () => {
      const result = map(Ok(5), x => x * 2);
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toBe(10);
    });

    it('should pass through Err', () => {
      const result = map(Err('error'), (x: number) => x * 2);
      expect(isErr(result)).toBe(true);
      if (!result.ok) expect(result.error).toBe('error');
    });
  });

  describe('flatMap', () => {
    it('should chain Ok results', () => {
      const result = flatMap(Ok(5), x => Ok(x * 2));
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toBe(10);
    });

    it('should return error if chain returns Err', () => {
      const result = flatMap(Ok(5), _x => Err('failed'));
      expect(isErr(result)).toBe(true);
      if (!result.ok) expect(result.error).toBe('failed');
    });

    it('should pass through initial Err', () => {
      const result = flatMap(Err('initial'), (x: number) => Ok(x * 2));
      expect(isErr(result)).toBe(true);
      if (!result.ok) expect(result.error).toBe('initial');
    });
  });

  describe('tap', () => {
    it('should execute side effect on Ok', () => {
      const effects: number[] = [];
      const result = tap(Ok(5), x => effects.push(x));
      
      expect(effects).toEqual([5]);
      expect(isOk(result)).toBe(true);
    });

    it('should not execute side effect on Err', () => {
      const effects: any[] = [];
      const result = tap(Err('error'), (x: number) => effects.push(x));
      
      expect(effects).toEqual([]);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('getOrElse', () => {
    it('should return Ok value', () => {
      const value = getOrElse(Ok(42), 0);
      expect(value).toBe(42);
    });

    it('should return default value on Err', () => {
      const value = getOrElse(Err('error'), 0);
      expect(value).toBe(0);
    });
  });

  describe('getOrThrow', () => {
    it('should return Ok value', () => {
      const value = getOrThrow(Ok(42));
      expect(value).toBe(42);
    });

    it('should throw on Err', () => {
      const result = Err('error message');
      expect(() => getOrThrow(result)).toThrow();
    });

    it('should throw Error if error is not Error instance', () => {
      const result = Err('string error');
      expect(() => getOrThrow(result)).toThrow('Result error');
    });
  });

  describe('catchError', () => {
    it('should not execute handler on Ok', () => {
      const handler = vi.fn(() => Ok(0));
      const result = catchError(Ok(42), handler);
      
      expect(handler).not.toHaveBeenCalled();
      expect(isOk(result)).toBe(true);
    });

    it('should execute handler on Err', () => {
      const handler = vi.fn(() => Ok(0));
      const result = catchError(Err('error'), handler);
      
      expect(handler).toHaveBeenCalledWith('error');
      expect(isOk(result)).toBe(true);
    });

    it('should return handler result on Err', () => {
      const result = catchError(Err('first'), _error => Ok(42));
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toBe(42);
    });
  });

  describe('combine', () => {
    it('should combine multiple Ok results', () => {
      const result = combine(Ok(1), Ok(2), Ok(3));
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toEqual([1, 2, 3]);
    });

    it('should return first Err', () => {
      const result = combine(Ok(1), Err('error1'), Ok(3), Err('error2'));
      expect(isErr(result)).toBe(true);
      if (!result.ok) expect(result.error).toBe('error1');
    });

    it('should handle empty list', () => {
      const result = combine();
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe('tryCatch', () => {
    it('should catch thrown errors', () => {
      const result = tryCatch(() => {
        throw new Error('test error');
      });
      
      expect(isErr(result)).toBe(true);
      if (!result.ok) expect(result.error.message).toBe('test error');
    });

    it('should return Ok on success', () => {
      const result = tryCatch(() => 42);
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toBe(42);
    });

    it('should apply error transform', () => {
      const transform = vi.fn((e: Error) => {
        e.message = 'transformed: ' + e.message;
        return e;
      });
      
      const result = tryCatch(() => {
        throw new Error('test');
      }, transform);
      
      expect(transform).toHaveBeenCalled();
      if (!result.ok) expect(result.error.message).toBe('transformed: test');
    });
  });

  describe('fromPromise', () => {
    it('should convert resolved promise to Ok', async () => {
      const result = await fromPromise(Promise.resolve(42));
      expect(isOk(result)).toBe(true);
      if (result.ok) expect(result.value).toBe(42);
    });

    it('should convert rejected promise to Err', async () => {
      const error = new Error('rejected');
      const result = await fromPromise(Promise.reject(error));
      
      expect(isErr(result)).toBe(true);
      if (!result.ok) expect(result.error).toBe(error);
    });

    it('should apply error transform on rejection', async () => {
      const transform = vi.fn((e: Error) => {
        e.message = 'async: ' + e.message;
        return e;
      });
      
      const result = await fromPromise(
        Promise.reject(new Error('test')),
        transform
      );
      
      expect(transform).toHaveBeenCalled();
      if (!result.ok) expect(result.error.message).toBe('async: test');
    });
  });

  describe('chaining', () => {
    it('should chain multiple operations', () => {
      const result = flatMap(
        Ok(5),
        x => Ok(x * 2)
      );
      const mapped = map(result, x => x + 1);
      const value = getOrElse(mapped, 0);
      
      expect(value).toBe(11); // (5 * 2) + 1
    });

    it('should short-circuit on error', () => {
      const result = flatMap(
        Ok(5),
        _x => Err('failed')
      );
      const mapped = map(result, x => x + 1);
      const recovered = catchError(mapped, _e => Ok(0));
      
      expect(isOk(recovered)).toBe(true);
      if (recovered.ok) expect(recovered.value).toBe(0);
    });
  });
});
