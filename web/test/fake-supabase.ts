import type { SupabaseClient } from "@supabase/supabase-js";

// An in-memory stand-in for the Supabase query builder, for unit tests of code that writes ai_jobs with conditional
// updates. Supports the subset the pipeline uses: select / insert / update / delete, the filters eq, neq, in, is, lt,
// lte, gt, gte and or (PostgREST syntax, including and(...) groups), JSON text paths ("output->>step"), order, limit,
// single and maybeSingle. Each statement runs atomically when awaited, so of two conditional updates racing for one
// row only the first matches, as in Postgres. Values are stored as JSON, which drops undefined fields as jsonb does.
// Seeded rows can play the part of what RLS lets the user see, so a test can check that a query narrows that down
// itself (for example to the user's own membership). No joins: embedded selects return whatever the seeded row holds.
// Optional: unique constraints on inserts (error code 23505, as PostgREST reports it) and rpc() functions implemented
// in the test.

export type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
export type FakeError = { message: string; code?: string; details?: string };
type Result = { data: unknown; error: FakeError | null };
export type Write = { table: string; kind: "insert" | "update" | "delete"; values: unknown };
export type FakeOptions = {
  // Per table, the column sets that must be unique among inserted rows.
  unique?: Record<string, string[][]>;
  // rpc(name, args) implementations; they get the args and the tables. Calling an unknown function is an error.
  rpc?: Record<string, (args: Row, tables: Record<string, Row[]>) => unknown>;
};

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
  private sorts: { column: string; ascending: boolean }[] = [];

  constructor(
    private table: string,
    private rows: Row[],
    private failNext: (write: Write) => FakeError | null,
    private defaults: () => Row,
    private unique: string[][] = [],
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
  // Sorts as Postgres does by default: nulls last ascending, first descending. Stable, so ties keep insertion order.
  order(column: string, options?: { ascending?: boolean }) {
    this.sorts.push({ column, ascending: options?.ascending !== false });
    return this;
  }
  private sorted(rows: Row[]): Row[] {
    if (this.sorts.length === 0) return rows;
    return [...rows].sort((x, y) => {
      for (const { column, ascending } of this.sorts) {
        const a = read(x, column);
        const b = read(y, column);
        if (a === b) continue;
        if (a === null) return ascending ? 1 : -1;
        if (b === null) return ascending ? -1 : 1;
        const cmp = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
        if (cmp !== 0) return ascending ? cmp : -cmp;
      }
      return 0;
    });
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
    if (injected) return { data: null, error: injected };
    const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
    const matches = () => this.rows.filter((row) => this.filters.every((f) => f(row)));
    let out: Row[];
    if (this.kind === "insert") {
      out = (Array.isArray(this.values) ? this.values : [this.values as Row]).map((v) => ({ ...this.defaults(), ...json(v) }));
      for (const columns of this.unique) {
        const key = (row: Row) => JSON.stringify(columns.map((c) => row[c] ?? null));
        const seen = new Set(this.rows.map(key));
        for (const row of out) {
          if (seen.has(key(row))) {
            return {
              data: null,
              error: {
                code: "23505",
                message: `duplicate key value violates unique constraint "${this.table}_${columns.join("_")}_key"`,
                details: `Key (${columns.join(", ")})=(${columns.map((c) => String(row[c])).join(", ")}) already exists.`,
              },
            };
          }
          seen.add(key(row));
        }
      }
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
      out = this.sorted(matches());
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
  // Makes the next n writes (insert, update, delete) that `match` fail with `error` (by default a dropped connection,
  // which PostgREST reports without a code).
  failWrites: (n: number, match?: (write: Write) => boolean, error?: FakeError) => void;
  // Every rpc() call, in order.
  rpcCalls: { name: string; args: Row }[];
};

// `defaults` are column defaults per table for inserted rows (every row also gets an id and created_at).
export function fakeSupabase(tables: Record<string, Row[]> = {}, defaults: Record<string, Row> = {}, options: FakeOptions = {}): FakeSupabase {
  let failures = 0;
  let matches: (write: Write) => boolean = () => true;
  let failure: FakeError = { message: "connection reset" };
  const failNext = (write: Write) => {
    if (failures <= 0 || !matches(write)) return null;
    failures -= 1;
    return failure;
  };
  const rpcCalls: { name: string; args: Row }[] = [];
  const db = {
    from(table: string) {
      tables[table] ??= [];
      const rowDefaults = () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...defaults[table] });
      return new Query(table, tables[table], failNext, rowDefaults, options.unique?.[table]);
    },
    async rpc(name: string, args: Row = {}): Promise<Result> {
      rpcCalls.push({ name, args });
      const fn = options.rpc?.[name];
      if (!fn) return { data: null, error: { code: "PGRST202", message: `Could not find the function public.${name}` } };
      return { data: fn(args, tables) ?? null, error: null };
    },
  };
  const failWrites = (n: number, match: (write: Write) => boolean = () => true, error: FakeError = { message: "connection reset" }) => {
    failures = n;
    matches = match;
    failure = error;
  };
  return { db: db as unknown as SupabaseClient, tables, failWrites, rpcCalls };
}
