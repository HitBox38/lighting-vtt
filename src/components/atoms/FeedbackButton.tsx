import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { DisplaySurveyType } from "posthog-js";
import { Button } from "@/components/ui/button";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { getAnalyticsContext } from "@/lib/analyticsContext";
import { useAnalyticsReady } from "@/lib/hooks/useAnalyticsView";

export const FEEDBACK_SURVEY_ID = "01a08b97-8d55-0000-7567-95d6f150d52b";

export function FeedbackButton({ surface }: { surface: "scene_library" | "dm_controls" | "effect_editor" }) {
  const posthog = usePostHog();
  const ready = useAnalyticsReady();
  const [surveyState, setSurveyState] = useState<"loading" | "available" | "unavailable">("loading");
  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => setSurveyState("unavailable"), 8_000);
    const unsubscribe = posthog.onSurveysLoaded((surveys) => {
      clearTimeout(timeout);
      setSurveyState(surveys.some(s => s.id === FEEDBACK_SURVEY_ID && Boolean(s.start_date) && !s.end_date) ? "available" : "unavailable");
    });
    return () => { clearTimeout(timeout); unsubscribe(); };
  }, [posthog, ready]);

  if (ready && surveyState === "loading") return <Button disabled size="sm" variant="ghost" title="Loading feedback">Feedback</Button>;
  if (!ready || surveyState !== "available") return <Button asChild size="sm" variant="ghost"><a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>Feedback</a></Button>;
  return <Button size="sm" variant="ghost" onClick={() => {
    const properties = { ...getAnalyticsContext(), surface };
    posthog.capture(ANALYTICS_EVENTS.FeedbackOpened, properties);
    posthog.displaySurvey(FEEDBACK_SURVEY_ID, { displayType: DisplaySurveyType.Popover, ignoreConditions: true, ignoreDelay: true, properties });
  }}>Feedback</Button>;
}
