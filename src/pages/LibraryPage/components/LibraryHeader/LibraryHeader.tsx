import { Link } from "react-router-dom";
import { AppSettingsDialog } from "@/components/organisms/AppSettingsDialog";
import { Button } from "@/components/ui/button";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";

export const LibraryHeader = () => (
  <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
    <div className="flex h-14 items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <img src="/lightling.svg" alt="" width={24} height={24} className="size-6 shrink-0" />
        <span className="sr-only sm:not-sr-only select-none text-base font-semibold tracking-tight">Lighting VTT</span>
      </div>
      <div className="flex items-center gap-3">
        <nav aria-label="Library navigation" className="flex gap-1"><Button asChild size="sm" variant="secondary"><Link to="/library" aria-current="page">Scenes</Link></Button><Button asChild size="sm" variant="ghost"><Link to="/effects">Effects</Link></Button></nav>
        <AppSettingsDialog />
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal" forceRedirectUrl="/library">
            <Button variant="default" size="sm">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/library">
            <Button variant="outline" size="sm">
              Sign up
            </Button>
          </SignUpButton>
        </Show>
      </div>
    </div>
  </header>
);
