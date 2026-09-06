import * as React from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "0rem";

type SidebarSide = "left" | "right";

interface SidebarContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  side: SidebarSide;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: SidebarSide;
}

function SidebarProvider({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  side = "left",
}: SidebarProviderProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = controlledOpen ?? internalOpen;

  const setIsOpen = React.useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalOpen(open);
      }
    },
    [onOpenChange]
  );

  const toggleOpen = React.useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  const value = React.useMemo(
    () => ({ isOpen, setIsOpen, toggleOpen, side }),
    [isOpen, setIsOpen, toggleOpen, side]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className="flex min-h-full w-full"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

interface SidebarProps extends React.ComponentProps<"aside"> {
  side?: SidebarSide;
}

function Sidebar({ className, side: sideProp, children, ...props }: SidebarProps) {
  const { isOpen, side: contextSide } = useSidebar();
  const side = sideProp ?? contextSide;

  return (
    <aside
      data-slot="sidebar"
      data-state={isOpen ? "open" : "closed"}
      data-side={side}
      className={cn(
        "bg-background/95 backdrop-blur-sm border-border flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-in-out max-lg:absolute max-lg:top-20 max-lg:bottom-3 max-lg:z-30 max-lg:h-auto max-lg:rounded-xl",
        side === "left" ? "border-r" : "border-l order-last",
        side === "left" ? "max-lg:left-3" : "max-lg:right-3",
        isOpen ? "w-(--sidebar-width)" : "w-(--sidebar-width-collapsed)",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex shrink-0 flex-col gap-2 p-3", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex shrink-0 flex-col gap-2 p-3", className)}
      {...props}
    />
  );
}

interface SidebarTriggerProps extends React.ComponentProps<typeof Button> {
  asChild?: boolean;
}

function SidebarTrigger({ className, asChild = false, ...props }: SidebarTriggerProps) {
  const { isOpen, toggleOpen, side } = useSidebar();
  const Comp = asChild ? Slot.Root : Button;

  const Icon = React.useMemo(() => {
    if (side === "left") {
      return isOpen ? PanelLeftClose : PanelLeftOpen;
    }
    return isOpen ? PanelRightClose : PanelRightOpen;
  }, [isOpen, side]);

  return (
    <Comp
      data-slot="sidebar-trigger"
      data-state={isOpen ? "open" : "closed"}
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={toggleOpen}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      {...props}
    >
      <Icon className="size-4" />
    </Comp>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("flex min-h-full min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
