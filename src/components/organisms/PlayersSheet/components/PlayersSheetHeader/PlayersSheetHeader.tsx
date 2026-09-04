import { Users } from "lucide-react";

import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function PlayersSheetHeader() {
  return (
    <SheetHeader className="pb-2">
      <SheetTitle className="flex items-center gap-2.5 text-lg">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Users className="size-4 text-primary" aria-hidden="true" />
        </div>
        Party Management
      </SheetTitle>
      <SheetDescription className="text-xs leading-relaxed">
        Invite players to join your table remotely. Manage profiles, assign tokens, and control turn
        order.
      </SheetDescription>
    </SheetHeader>
  );
}
