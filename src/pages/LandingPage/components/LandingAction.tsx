import { cn } from "@/lib/utils";
import { Show, SignUpButton } from "@clerk/react";
import { usePostHog } from "@posthog/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function LandingAction({
  placement,
}: {
  placement: "header" | "hero" | "closing";
}) {
  const posthog = usePostHog();
  const track = (action: string) =>
    posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, { placement, action });
  const className = cn(
    "rounded-md border border-[#ffb547] bg-[#ffb547] font-semibold text-[#222017] shadow-none hover:border-[#ffc572] hover:bg-[#ffc572]",
    placement === "header"
      ? "max-[760px]:px-2.5 max-[760px]:has-[>svg]:px-2.5 max-[760px]:text-xs/5 max-[760px]:[&_svg]:hidden"
      : "min-h-12 px-[22px] has-[>svg]:px-[22px]",
  );
  return (
    <span className={cn("inline-grid shrink-0 [&>*]:col-start-1 [&>*]:row-start-1", placement === "header" && "w-[126px] max-[760px]:w-[100px]")}>
      <span
        aria-hidden="true"
        className={cn(buttonVariants({ size: placement === "header" ? "default" : "lg" }), className, "invisible")}
      >
        {placement === "header" ? "Get started" : "Create your first scene"}
        <ArrowUpRight />
      </span>
      <Show when="signed-out">
        <SignUpButton mode="modal" forceRedirectUrl="/library">
          <Button
            className={className}
            size={placement === "header" ? "default" : "lg"}
            onClick={() => track("sign_up")}
          >
            {placement === "header" ? "Get started" : "Create your first scene"}
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Button
          className={className}
          size={placement === "header" ? "default" : "lg"}
          asChild
        >
          <Link to="/library" onClick={() => track("open_library")}>
            {placement === "header" ? "Your library" : "Open your library"}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </Show>
    </span>
  );
}
