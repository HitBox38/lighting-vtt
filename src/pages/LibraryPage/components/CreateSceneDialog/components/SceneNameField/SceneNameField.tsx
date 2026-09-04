import { Input } from "@/components/ui/input";
import type { useCreateSceneForm } from "@/pages/LibraryPage/hooks/useCreateSceneForm";

type FormHandle = ReturnType<typeof useCreateSceneForm>;

interface SceneNameFieldProps {
  form: FormHandle;
}

export function SceneNameField({ form }: SceneNameFieldProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor="scene-name" className="text-sm font-medium">
        Scene Name
      </label>
      <Input
        id="scene-name"
        placeholder="Enter scene name..."
        autoFocus
        disabled={form.isSubmitting}
        aria-invalid={!!form.errors.name}
        {...form.register("name", {
          required: "Scene name is required",
          validate: (value) => value.trim().length > 0 || "Scene name cannot be empty",
        })}
      />
      {form.errors.name ? (
        <p className="text-sm text-destructive">{form.errors.name.message}</p>
      ) : null}
    </div>
  );
}
