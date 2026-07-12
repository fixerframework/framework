import { describe, it, expect } from "vitest";
import {
  isNull,
  isUndefined,
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isObject,
  isPlainObject,
  isArray,
  isPromise,
  isNonNullable,
} from "../index.ts";

describe("type guards", () => {
  describe("isNull", () => {
    it("returns true for null", () => {
      expect(isNull(null)).toBe(true);
    });
    it("returns false for undefined", () => {
      expect(isNull(undefined)).toBe(false);
    });
  });

  describe("isUndefined", () => {
    it("returns true for undefined", () => {
      expect(isUndefined(undefined)).toBe(true);
    });
    it("returns false for null", () => {
      expect(isUndefined(null)).toBe(false);
    });
  });

  describe("isString", () => {
    it("accepts strings", () => {
      expect(isString("")).toBe(true);
      expect(isString("hello")).toBe(true);
    });
    it("rejects non-strings", () => {
      expect(isString(42)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });

  describe("isNumber", () => {
    it("accepts finite numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1.5)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
    });
    it("rejects NaN", () => {
      expect(isNumber(NaN)).toBe(false);
    });
    it("rejects number strings", () => {
      expect(isNumber("42")).toBe(false);
    });
  });

  describe("isBoolean", () => {
    it("accepts true and false", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });
    it("rejects truthy/falsy non-booleans", () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
    });
  });

  describe("isFunction", () => {
    it("accepts functions", () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(Math.max)).toBe(true);
    });
    it("rejects non-functions", () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe("isObject", () => {
    it("accepts plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });
    it("rejects arrays", () => {
      expect(isObject([])).toBe(false);
    });
    it("rejects null and primitives", () => {
      expect(isObject(null)).toBe(false);
      expect(isObject("str")).toBe(false);
    });
  });

  describe("isPlainObject", () => {
    it("accepts objects with Object.prototype or null proto", () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });
    it("rejects class instances", () => {
      class Foo {}
      expect(isPlainObject(new Foo())).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });
    it("rejects arrays", () => {
      expect(isPlainObject([])).toBe(false);
    });
  });

  describe("isArray", () => {
    it("accepts arrays", () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2])).toBe(true);
    });
    it("rejects non-arrays", () => {
      expect(isArray({ length: 0 })).toBe(false);
    });
  });

  describe("isPromise", () => {
    it("accepts thenables", () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      const rejected = Promise.reject();
      rejected.catch(() => {});
      expect(isPromise(rejected)).toBe(true);
    });
    it("accepts custom thenables", () => {
      expect(isPromise({ then: () => {} })).toBe(true);
    });
    it("rejects non-thenables", () => {
      expect(isPromise({})).toBe(false);
      expect(isPromise(null)).toBe(false);
    });
  });

  describe("isNonNullable", () => {
    it("filters out null and undefined", () => {
      const arr = [1, null, 2, undefined, 3];
      const filtered = arr.filter(isNonNullable);
      expect(filtered).toEqual([1, 2, 3]);
    });
    it("returns false for null and undefined", () => {
      expect(isNonNullable(null)).toBe(false);
      expect(isNonNullable(undefined)).toBe(false);
    });
    it("returns true for falsy but non-null values", () => {
      expect(isNonNullable(0)).toBe(true);
      expect(isNonNullable("")).toBe(true);
      expect(isNonNullable(false)).toBe(true);
    });
  });
});
