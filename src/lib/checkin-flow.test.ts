import { describe, expect, it, vi } from "vitest";
import { commitCheckinAndSynchronize } from "./checkin-flow";

describe("fluxo de confirmação do check-in", () => {
  it("mantém o sucesso quando apenas a sincronização posterior falha", async () => {
    const response = { created: true, session_id: "session-1" };
    await expect(commitCheckinAndSynchronize(
      vi.fn().mockResolvedValue(response),
      vi.fn().mockRejectedValue(new Error("falha de leitura")),
    )).resolves.toEqual(response);
  });

  it("propaga um erro quando a gravação realmente falha", async () => {
    const synchronize = vi.fn();
    await expect(commitCheckinAndSynchronize(
      vi.fn().mockRejectedValue(new Error("falha de gravação")),
      synchronize,
    )).rejects.toThrow("falha de gravação");
    expect(synchronize).not.toHaveBeenCalled();
  });
});
