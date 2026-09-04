import { z } from "zod";

export const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const createTokenFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  borderColor: z.string().regex(HEX_COLOR, "Border color must be a valid hex string").optional(),
});

export type CreateTokenFormValues = z.infer<typeof createTokenFormSchema>;

export const defaultCreateTokenFormValues: CreateTokenFormValues = {
  name: "",
  borderColor: "#ffffff",
};
