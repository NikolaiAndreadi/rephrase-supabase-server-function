import { Pool, PoolClient } from "jsr:@db/postgres";

export type TransactionResult<T> = {
  ret: T;
  success: boolean;
};

export function TxOk<T>(ret: T): TransactionResult<T> {
  return { success: true, ret };
}

export function TxFail<T>(ret: T): TransactionResult<T> {
  return { success: false, ret };
}

export async function WithTransaction<T, Args extends unknown[]>(
  pool: Pool,
  fn: (client: PoolClient, ...args: Args) => Promise<TransactionResult<T>>,
  ...args: Args
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.queryObject("BEGIN");

    const result = await fn(client, ...args);

    try {
      await client.queryObject(result.success ? "COMMIT" : "ROLLBACK");
    } catch (commitErr) {
      console.error("Commit/Rollback failure", commitErr);
      throw commitErr;
    }

    return result.ret;
  } catch (err) {
    console.error("Transaction function threw error", err);
    try {
      await client.queryObject("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback failure", rollbackErr);
      throw new AggregateError([
        err as Error,
        rollbackErr as Error,
      ], "Transaction failed and rollback also failed");
    }
    throw err;
  } finally {
    client.release();
  }
}
