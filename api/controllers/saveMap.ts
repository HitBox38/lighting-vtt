export type SaveMapPayload = Record<string, unknown> | null | undefined;

export const saveMap = async (payload?: SaveMapPayload) => {
  return {
    message: "Map saved successfully",
    payload,
  };
};
