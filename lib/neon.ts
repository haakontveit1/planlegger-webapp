import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;
let _client: SqlClient | undefined;

// Lazily initialize so the build doesn't require DATABASE_URL at compile time
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  if (!_client) _client = neon(process.env.DATABASE_URL!);
  return _client(strings as any, ...values);
}) as unknown as SqlClient;
