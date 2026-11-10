/**
 * Supabase's RPC response is not always inferred through generic timing wrappers.
 * Validate the runtime envelope before reading its error field rather than
 * destructuring an `unknown` result or asserting success.
 */
export function transactionRpcError(response: unknown): unknown {
  if (response === null || typeof response !== "object" || !("error" in response)) {
    throw new Error("Phản hồi giao dịch từ máy chủ không hợp lệ. Vui lòng thử lại.");
  }
  return response.error;
}
