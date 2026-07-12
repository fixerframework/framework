import type { DialectId } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import type { SqlTypeName } from "./ids.ts";

export interface TypeCodec {
  /** Encode a JS value for wire/driver binding. */
  encode(value: unknown, hint?: SqlTypeName): unknown;
  /** Decode a driver value into a convenient JS form (best-effort). */
  decode(value: unknown, hint?: SqlTypeName): unknown;
}

function isUint8Array(v: unknown): v is Uint8Array {
  return v instanceof Uint8Array;
}

function encodeDate(value: Date, dialect: DialectId, hint?: SqlTypeName): unknown {
  if (hint === "date") {
    return value.toISOString().slice(0, 10);
  }
  if (hint === "time") {
    return value.toISOString().slice(11, 23);
  }
  // timestamptz / timestamp — ISO string is portable across drivers
  if (dialect === "sqlite") {
    return value.toISOString();
  }
  return value;
}

function encodeBoolean(value: boolean, dialect: DialectId): unknown {
  if (dialect === "sqlite") return value ? 1 : 0;
  if (dialect === "mysql") return value ? 1 : 0;
  return value;
}

function encodeJson(value: unknown, dialect: DialectId): unknown {
  if (dialect === "postgres") {
    // Most pg drivers accept objects; stringify for safety with raw protocols
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function encodeArray(value: unknown[], dialect: DialectId): unknown {
  if (dialect === "postgres") {
    // Let native drivers handle arrays when possible; fall back to PG array literal
    return value;
  }
  return JSON.stringify(value);
}

function encodeValue(value: unknown, dialect: DialectId, hint?: SqlTypeName): unknown {
  if (value === null || value === undefined) return null;

  if (hint) {
    switch (hint) {
      case "boolean":
        return encodeBoolean(Boolean(value), dialect);
      case "int2":
      case "int4":
        return typeof value === "bigint" ? Number(value) : Number(value);
      case "int8":
        return typeof value === "bigint" ? value : BigInt(value as number | string);
      case "float4":
      case "float8":
        return Number(value);
      case "numeric":
        return String(value);
      case "json":
      case "jsonb":
        return encodeJson(value, dialect);
      case "bytea":
      case "blob":
        if (isUint8Array(value)) return value;
        throw new DbError("CODEC", `Expected Uint8Array for ${hint}`);
      case "date":
      case "time":
      case "timestamp":
      case "timestamptz":
        if (value instanceof Date) return encodeDate(value, dialect, hint);
        return value;
      case "uuid":
      case "text":
      case "varchar":
      case "char":
      case "enum":
      case "inet":
      case "cidr":
      case "interval":
      case "xml":
        return String(value);
      case "array":
        if (!Array.isArray(value)) {
          throw new DbError("CODEC", "Expected array for array type");
        }
        return encodeArray(value, dialect);
      case "null":
        return null;
    }
  }

  // Infer from JS type
  if (typeof value === "boolean") return encodeBoolean(value, dialect);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (value instanceof Date) return encodeDate(value, dialect, "timestamptz");
  if (isUint8Array(value)) return value;
  if (Array.isArray(value)) return encodeArray(value, dialect);
  if (typeof value === "object") return encodeJson(value, dialect);

  return value;
}

function decodeValue(value: unknown, dialect: DialectId, hint?: SqlTypeName): unknown {
  if (value === null || value === undefined) return null;

  if (hint === "boolean" || (dialect === "sqlite" && (value === 0 || value === 1) && hint === undefined)) {
    if (typeof value === "boolean") return value;
    if (value === 0 || value === "0" || value === false) return false;
    if (value === 1 || value === "1" || value === true) return true;
  }

  if (hint === "json" || hint === "jsonb") {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  if (hint === "timestamp" || hint === "timestamptz") {
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  if (hint === "int8" && typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  }

  if (hint === "array" && typeof value === "string" && dialect !== "postgres") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

export function createCodec(dialect: DialectId): TypeCodec {
  return {
    encode(value, hint) {
      return encodeValue(value, dialect, hint);
    },
    decode(value, hint) {
      return decodeValue(value, dialect, hint);
    },
  };
}

const codecCache = new Map<DialectId, TypeCodec>();

export function getCodec(dialect: DialectId): TypeCodec {
  let c = codecCache.get(dialect);
  if (!c) {
    c = createCodec(dialect);
    codecCache.set(dialect, c);
  }
  return c;
}
