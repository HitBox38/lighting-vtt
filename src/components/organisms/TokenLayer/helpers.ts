export const toHexNumber = (color: string): number => {
  const normalized = color.startsWith("#") ? color.slice(1) : color;
  const parsed = Number.parseInt(normalized.slice(0, 6), 16);
  return Number.isNaN(parsed) ? 0xffffff : parsed;
};
