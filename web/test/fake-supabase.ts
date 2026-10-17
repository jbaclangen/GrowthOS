import type { SupabaseClient } from "@supabase/supabase-js";

// An in-memory stand-in for the Supabase query builder, for unit tests of code that writes ai_jobs with conditional
// updates. Supports the subset the pipeline uses: select / insert / update / delete, the filters eq, neq, in, is, lt,
// lte, gt, gte and or (PostgREST syntax, including and(...) groups), JSON text paths ("output->>step"), limit,
// order (ignored), single and maybeSingle. Each statement runs atomically when awaited, so of two conditional updates
// racing for one row only the first matches, as in Postgres. Values are stored as JSON, which drops undefined fields
// as jsonb does.

export type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type Result = { data: unknown; error: { message: string } | null };
export type Write = { table: string; kind: "insert" | "update" | "delete"; values: unknown };

// A column, or a JSON field as text with "col->>key" (null when missing, as in Postgres).
function read(row: Row, column: string): unknown {
  const [col, key] = column.split("->>");
  const value = row[col];
  if (key === undefined) return value ?? null;
  if (value === null || typeof value !== "object") return null;
  const field = (value as Row)[key];
  if (field === null || field === undefined) return null;
  return typeof field === "object" ? JSON.stringify(field) : String(field);
}

function compare(op: string, actual: unknown, expected: unknown): boolean {
  if (op === "is") return expected === null ? actual === null : String(actual) === String(expected);
  if (actual === null) return false;
  const a = String(actual);
  const b = String(expected);
  switch (op) {
    case "eq":
      return a === b;
    case "neq":
      return a !== b;
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
  }
  throw new Error(`fake-supabase: unsupported operator ${op}`);
}

// Splits on top-level commas (outside parentheses and double quotes).
function splitTop(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '"') quoted = !quoted;
    else if (!quoted && c === "(") depth++;
    else if (!quoted && c === ")") depth--;
    else if (!quoted && depth === 0 && c === ",") {
      parts.push(expr.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(expr.slice(start));
  return parts;
}

function parseTerm(term: string): Filter {
  if (term.startsWith("and(") && term.endsWith(")")) {
    const parts = splitTop(term.slice(4, -1)).map(parseTerm);
    return (row) => parts.every((p) => p(row));
  }
  if (term.startsWith("or(") && term.endsWith(")")) {
    const parts = splitTop(term.slice(3, -1)).map(parseTerm);
    return (row) => parts.some((p) => p(row));
  }
  const m = /^(.+?)\.(eq|neq|lt|lte|gt|gte|is)\.(.*)$/.exec(term);
  if (!m) throw new Error(`fake-supabase: can't parse filter ${term}`);
  const [, column, op, raw] = m;
  const unquoted = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  const expected = op === "is" && raw === "null" ? null : unquoted;
  return (row) => compare(op, read(row, column), expected);
}

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private kind: "select" | "insert" | "update" | "delete" = "select";
  private values: Row | Row[] | undefined;
  private returning = false;
  private max: number | undefined;
  private one: "single" | "maybe" | undefined;

  constructor(
    private table: string,
    private rows: Row[],
    private failNext: (write: Write) => string | null,
    private defaults: () => Row,
  ) {}

  select() {
    if (this.kind !== "select") this.returning = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.kind = "insert";
    this.values = values;
    return this;
  }
  update(values: Row) {
    this.kind = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.kind = "delete";
    return this;
  }
  private where(filter: Filter) {
    this.filters.push(filter);
    return this;
  }
  eq(column: string, value: unknown) {
    return this.where((row) => compare("eq", read(row, column), value));
  }
  neq(column: string, value: unknown) {
    return this.where((row) => compare("neq", read(row, column), value));
  }
  lt(column: string, value: unknown) {
    return this.where((row) => compare("lt", read(row, column), value));
  }
  lte(column: string, value: unknown) {
    return this.where((row) => compare("lte", read(row, column), value));
  }
  gt(column: string, value: unknown) {
    return this.where((row) => compare("gt", read(row, column), value));
  }
  gte(column: string, value: unknown) {
    return this.where((row) => compare("gte", read(row, column), value));
  }
  is(column: string, value: null) {
    return this.where((row) => compare("is", read(row, column), value));
  }
  in(column: string, values: unknown[]) {
    return this.where((row) => {
      const actual = read(row, column);
      return actual !== null && values.map(String).includes(String(actual));
    });
  }
  or(expr: string) {
    const terms = splitTop(expr).map(parseTerm);
    return this.where((row) => terms.some((t) => t(row)));
  }
  order() {
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  then<A = Result, B = never>(onFulfilled?: ((r: Result) => A | PromiseLike<A>) | null, onRejected?: ((e: unknown) => B | PromiseLike<B>) | null) {
    let result: Result;
    try {
      result = this.run();
    } catch (e) {
      return Promise.reject(e).then(null, onRejected);
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }

  private run(): Result {
    const injected = this.kind === "select" ? null : this.failNext({ table: this.table, kind: this.kind, values: this.values });
    if (injected) return { data: null, error: { message: injected } };
    const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
    const matches = () => this.rows.filter((row) => this.filters.every((f) => f(row)));
    let out: Row[];
    if (this.kind === "insert") {
      out = (Array.isArray(this.values) ? this.values : [this.values as Row]).map((v) => ({ ...this.defaults(), ...json(v) }));
      this.rows.push(...out);
      if (!this.returning) return { data: null, error: null };
    } else if (this.kind === "update") {
      out = matches();
      for (const row of out) Object.assign(row, json(this.values));
      if (!this.returning) return { data: null, error: null };
    } else if (this.kind === "delete") {
      out = matches();
      for (const row of out) this.rows.splice(this.rows.indexOf(row), 1);
      if (!this.returning) return { data: null, error: null };
    } else {
      out = matches();
    }
    const data = json(this.max === undefined ? out : out.slice(0, this.max));
    if (!this.one) return { data, error: null };
    if (this.one === "single" && data.length !== 1) return { data: null, error: { message: `expected one row, got ${data.length}` } };
    return { data: data[0] ?? null, error: null };
  }
}

export type FakeSupabase = {
  db: SupabaseClient;
  tables: Record<string, Row[]>;
  // Makes the next n writes (insert, update, delete) that `match` fail with an error, as a dropped connection would.
  failWrites: (n: number, match?: (write: Write) => boolean) => void;
};

// `defaults` are column defaults per table for inserted rows (every row also gets an id and created_at).
export function fakeSupabase(tables: Record<string, Row[]> = {}, defaults: Record<string, Row> = {}): FakeSupabase {
  let failures = 0;
  let matches: (write: Write) => boolean = () => true;
  const failNext = (write: Write) => {
    if (failures <= 0 || !matches(write)) return null;
    failures -= 1;
    return "connection reset";
  };
  const db = {
    from(table: string) {
      tables[table] ??= [];
      const rowDefaults = () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...defaults[table] });
      return new Query(table, tables[table], failNext, rowDefaults);
    },
  };
  const failWrites = (n: number, match: (write: Write) => boolean = () => true) => {
    failures = n;
    matches = match;
  };
  return { db: db as unknown as SupabaseClient, tables, failWrites };
}
