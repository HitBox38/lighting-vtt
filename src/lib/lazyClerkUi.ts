import type { ui } from "@clerk/ui";
import { version } from "@clerk/ui/package.json";

type UiConstructor = NonNullable<typeof ui.ClerkUI>;

/** Clerk can initialize auth immediately; only mounting its UI imports the UI code. */
export function createLazyClerkUiConstructor(load: () => Promise<UiConstructor>, uiVersion: string): UiConstructor {
  return class LazyClerkUi {
    static version = uiVersion;
    version = uiVersion;
    private instance: Promise<InstanceType<UiConstructor>> | undefined;
    private args: ConstructorParameters<UiConstructor>;

    constructor(...args: ConstructorParameters<UiConstructor>) {
      this.args = args;
    }

    ensureMounted(options?: Parameters<InstanceType<UiConstructor>["ensureMounted"]>[0]) {
      this.instance ??= load().then((Constructor) => new Constructor(...this.args)).catch((error: unknown) => {
        this.instance = undefined;
        throw error;
      });
      return this.instance.then((instance) => instance.ensureMounted(options));
    }
  };
}

// Preserve the official Ui marker and its version while adapting the documented
// ClerkUI constructor/ensureMounted interface. The nominal Ui brand is type-only.
export const lazyClerkUi = {
  __brand: "__clerkUI",
  version,
  ClerkUI: createLazyClerkUiConstructor(async () => {
    const { ui: loadedUi } = await import("@clerk/ui");
    if (!loadedUi.ClerkUI) throw new Error("Clerk UI is unavailable");
    return loadedUi.ClerkUI;
  }, version),
} as typeof ui;
