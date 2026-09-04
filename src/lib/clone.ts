export const cloneSerializable = <T>(value: T): T => {
  return structuredClone(value);
};
