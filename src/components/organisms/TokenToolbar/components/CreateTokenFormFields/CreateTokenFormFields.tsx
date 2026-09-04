import { TokenImageField } from "@/components/organisms/TokenToolbar/components/TokenImageField";
import type { useCreateTokenForm } from "@/components/organisms/TokenToolbar/hooks/useCreateTokenForm";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type FormHandle = ReturnType<typeof useCreateTokenForm>;

interface CreateTokenFormFieldsProps {
  form: FormHandle;
}

export function CreateTokenFormFields({ form }: CreateTokenFormFieldsProps) {
  const { register, formState } = form.form;
  const errors = formState.errors;

  return (
    <>
      <div className="grid gap-2">
        <label htmlFor="token-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="token-name"
          placeholder="Goblin, Chest, Hero..."
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="token-border-color-toggle" className="text-sm font-medium">
            Border Color <span className="text-muted-foreground">(optional)</span>
          </label>
          <Switch
            id="token-border-color-toggle"
            checked={form.useBorderColor}
            onCheckedChange={(checked) => {
              form.setUseBorderColor(checked);
              if (!checked) {
                form.form.setValue("borderColor", undefined);
                form.form.clearErrors("borderColor");
              } else {
                form.form.setValue("borderColor", "#ffffff");
              }
            }}
          />
        </div>
        {form.useBorderColor ? (
          <>
            <Input
              id="token-border-color"
              type="color"
              className="h-10 w-16 cursor-pointer p-1"
              {...register("borderColor")}
            />
            {errors.borderColor ? (
              <p id="token-border-color-error" className="text-sm text-destructive" role="alert">
                {errors.borderColor.message}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      <TokenImageField
        imageUrl={form.imageUrl}
        imageKey={form.imageKey}
        isUploading={form.isUploading}
        onFileSelected={(file) => {
          void form.startUpload([file]);
        }}
        onClearImage={form.clearImage}
      />
    </>
  );
}
