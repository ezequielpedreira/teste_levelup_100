export async function commitCheckinAndSynchronize<T>(
  commit: () => Promise<T>,
  synchronize: () => Promise<unknown>,
): Promise<T> {
  const result = await commit();
  // A leitura auxiliar não pode transformar uma gravação confirmada em erro visual.
  void synchronize().catch(() => undefined);
  return result;
}
