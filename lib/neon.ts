import { neon } from "@neondatabase/serverless";

let _client: ReturnType<typeof neon> | undefined;

export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  if (!_client) _client = neon(process.env.DATABASE_URL!);
  return _client(strings as any, ...values) as any;
}
