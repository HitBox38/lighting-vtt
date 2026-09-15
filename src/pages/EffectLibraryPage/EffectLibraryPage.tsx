import { Link, useSearchParams } from "react-router-dom";
import {
  useUser,
  UserButton,
  Show,
  SignInButton,
} from "@clerk/react";
import { useConvexAuth, usePaginatedQuery, useQuery } from "convex/react";
import { useAnalyticsView } from "@/lib/hooks/useAnalyticsView";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { AppSettingsDialog } from "@/components/organisms/AppSettingsDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EffectGlyph } from "@/components/molecules/EffectGlyph/EffectGlyph";
import { PlaceEffectButton } from "@/components/molecules/PlaceEffectButton/PlaceEffectButton";
import { EffectCard } from "./components/EffectCard";
import { EffectDetail } from "./components/EffectDetail";
import { ModerationQueue } from "./components/ModerationQueue";
import { cn } from "@/lib/utils";
import { BASICS, catalogKey, catalogName } from "@/lib/effects/catalog";
import {
  newEffectPath,
  RETURN_TO_PARAM,
  sanitizeReturnTo,
} from "@/lib/effects/routes";
import { EFFECT_CATEGORIES, effectCategorySchema } from "@shared/effects";
import { EffectLibraryPresenter } from "./helpers";

const SOURCE_TABS = [
  ["public", "Explore"],
  ["mine", "My effects"],
] as const;

const SORT_OPTIONS = [
  ["newest", "Newest first"],
  ["name", "Name A-Z"],
] as const;

export function EffectLibraryPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const returnTo = sanitizeReturnTo(params.get(RETURN_TO_PARAM));
  const selected = params.get("effect");
  const rawTab = params.get("tab");
  const tab =
    rawTab === "mine" || rawTab === "reports" ? rawTab : "public";
  const search = params.get("q") ?? "";
  const category = effectCategorySchema.safeParse(params.get("category"));
  const activeCategory = category.success ? category.data : undefined;
  const sort = EffectLibraryPresenter.sortFromParam(params.get("sort"));
  const admin =
    useQuery(api.effects.amAdmin, isAuthenticated ? {} : "skip") ?? false;
  const result = usePaginatedQuery(
    api.effects.browse,
    tab === "reports" || (tab === "mine" && !isAuthenticated)
      ? "skip"
      : {
          search,
          mine: tab === "mine",
          category: activeCategory,
          sort,
        },
    { initialNumItems: EffectLibraryPresenter.pageSize },
  );
  const update = (key: string, value: string | null, replace = false) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key === "effect") next.delete("version");
        return next;
      },
      { replace },
    );
  const clearSearch = () => update("q", null, true);
  const clearAllBrowseFilters = () =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("q");
        next.delete("category");
        next.delete("sort");
        return next;
      },
      { replace: true },
    );
  useAnalyticsView(ANALYTICS_EVENTS.EffectLibraryViewed, "effect-library", {
    from_scene: Boolean(returnTo),
  });
  const searchLower = search.toLowerCase();
  const basics = BASICS.filter((item) =>
    catalogName(item).toLowerCase().includes(searchLower),
  );
  const showBasics =
    tab === "public" &&
    (!activeCategory || activeCategory === "Light") &&
    basics.length > 0;
  const visibleResultCount = result.results.length + (showBasics ? basics.length : 0);
  const browsingEffects = tab !== "reports" && !(tab === "mine" && !isAuthenticated);
  const resultAnnouncement = browsingEffects
    ? result.status === "LoadingFirstPage"
      ? "Loading effects."
      : `${EffectLibraryPresenter.countLabel(visibleResultCount)}. Search ${
          search || "empty"
        }. Category ${activeCategory ?? "All"}. Sort ${
          sort === "name" ? "name A-Z" : "newest first"
        }.`
    : tab === "reports"
      ? "Moderation reports selected."
      : "My effects selected. Sign in to browse your effects.";
  const showEmptyState =
    browsingEffects &&
    result.status !== "LoadingFirstPage" &&
    result.results.length === 0 &&
    !showBasics;
  const sourceTabs = admin
    ? [...SOURCE_TABS, ["reports", "Reports"] as const]
    : SOURCE_TABS;

  return (
    <div className="mobile-page flex h-dvh flex-col bg-background font-sans text-foreground">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-2 shadow-sm shadow-stone-950/5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            aria-label="Lighting VTT home"
            className="inline-flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight"
          >
            <img
              src="/lightling.svg"
              alt=""
              width={30}
              height={30}
              className="size-7 shrink-0"
            />
            <span className="hidden sm:inline">
              Lighting <span className="font-normal text-muted-foreground">VTT</span>
            </span>
          </Link>
          <nav
            aria-label="Library navigation"
            className="flex items-center gap-1"
          >
            {returnTo ? (
              <Button asChild variant="ghost" size="icon">
                <Link to={returnTo} aria-label="Back to scene">
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link to="/library">Scenes</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to={`/effects?${params}`} aria-current="page">
                Effects
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <AppSettingsDialog mobileFriendly />
          <Button asChild size="sm" className="workshop-primary">
            <Link
              to={newEffectPath(returnTo ?? undefined, `/effects?${params}`)}
            >
              <Plus className="size-4" />
              Create effect
            </Link>
          </Button>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
          </Show>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <main
          className={`min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 ${selected ? "hidden lg:block" : ""}`}
        >
          <div className="mb-6">
            <p className="workshop-eyebrow">The effect workshop</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Give your scene a little life.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Shape the light. Set something in motion. Find an effect for your
              next moment at the table.
            </p>
          </div>
          <section
            aria-labelledby="effect-browse-controls"
            className="sticky top-[-1rem] z-50 isolate -mx-4 bg-background px-4 pt-2 pb-6 shadow-[0_18px_28px_-26px_rgba(28,25,23,0.9)] sm:top-[-1.5rem] sm:-mx-6 sm:px-6"
          >
            <div className="rounded-2xl border border-amber-900/10 bg-stone-50 p-3 shadow-lg shadow-stone-950/5 dark:border-amber-300/10 dark:bg-stone-950">
              <h2 id="effect-browse-controls" className="sr-only">
                Browse effects
              </h2>
              <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_auto_auto] xl:items-end">
                <div className="space-y-1.5">
                  <label
                    htmlFor="effect-search"
                    className="workshop-eyebrow block"
                  >
                    Search
                  </label>
                  <div className="relative">
                    <Input
                      id="effect-search"
                      className="h-10 border-stone-300 bg-background pr-16 focus-visible:ring-amber-500 dark:border-stone-700"
                      aria-describedby="effect-result-count"
                      placeholder="Search lighting and atmosphere..."
                      value={search}
                      onChange={(e) => update("q", e.target.value, true)}
                    />
                    {search ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 right-1 h-8 -translate-y-1/2 px-2 text-xs text-amber-800 hover:bg-amber-500/10 hover:text-amber-950 dark:text-amber-300"
                        aria-label="Clear search"
                        onClick={clearSearch}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 xl:justify-center">
                  <fieldset className="min-w-0">
                    <legend className="workshop-eyebrow mb-1">Source</legend>
                    <div className="flex flex-wrap gap-1" aria-label="Effect source">
                      {sourceTabs.map(([value, label]) => (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-pressed={tab === value}
                          key={value}
                          className={cn(
                            "h-8 rounded-full px-3 text-xs",
                            tab === value
                              ? "bg-amber-500 text-stone-950 hover:bg-amber-400"
                              : "text-stone-700 hover:bg-amber-500/10 dark:text-stone-200",
                          )}
                          onClick={() => update("tab", value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                  {tab !== "reports" ? (
                    <fieldset className="min-w-0">
                      <legend className="workshop-eyebrow mb-1">Category</legend>
                      <div className="flex flex-wrap gap-1" aria-label="Effect category">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-pressed={!activeCategory}
                          className={cn(
                            "h-8 rounded-full px-3 text-xs",
                            !activeCategory
                              ? "bg-amber-500 text-stone-950 hover:bg-amber-400"
                              : "text-stone-700 hover:bg-amber-500/10 dark:text-stone-200",
                          )}
                          onClick={() => update("category", null)}
                        >
                          All
                        </Button>
                        {EFFECT_CATEGORIES.map((c) => (
                          <Button
                            size="sm"
                            key={c}
                            variant="ghost"
                            aria-pressed={activeCategory === c}
                            className={cn(
                              "h-8 rounded-full px-3 text-xs",
                              activeCategory === c
                                ? "bg-amber-500 text-stone-950 hover:bg-amber-400"
                                : "text-stone-700 hover:bg-amber-500/10 dark:text-stone-200",
                            )}
                            onClick={() => update("category", c)}
                          >
                            {c}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </div>
                <div className="min-w-36 space-y-1.5">
                  <label
                    id="effect-sort-label"
                    htmlFor="effect-sort"
                    className="workshop-eyebrow block"
                  >
                    Sort
                  </label>
                  <Select
                    value={sort}
                    disabled={tab === "reports"}
                    onValueChange={(value) =>
                      update(
                        "sort",
                        value === "newest" ? null : value,
                      )
                    }
                  >
                    <SelectTrigger
                      id="effect-sort"
                      aria-labelledby="effect-sort-label"
                      size="sm"
                      className="h-10 w-full border-stone-300 bg-background text-sm text-foreground focus-visible:ring-amber-500 dark:border-stone-700 dark:bg-stone-950/80"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-900/20 bg-stone-950 text-stone-50">
                      {SORT_OPTIONS.map(([value, label]) => (
                        <SelectItem
                          key={value}
                          value={value}
                          className="focus:bg-amber-500/20 focus:text-amber-100"
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div
                id="effect-result-count"
                className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {browsingEffects
                    ? EffectLibraryPresenter.countLabel(visibleResultCount)
                    : tab === "reports"
                      ? "Moderator reports"
                      : "Sign in required"}
                </span>
                <span>
                  Lighting, atmosphere, magic, and table geometry only.
                </span>
              </div>
            </div>
          </section>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {resultAnnouncement}
          </p>
          {showBasics ? (
            <section className="mb-8" aria-labelledby="built-in-effects-title">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="workshop-eyebrow">Built-in essentials</p>
                  <h2 id="built-in-effects-title" className="text-lg font-semibold tracking-tight">
                    Ready table lights
                  </h2>
                </div>
              </div>
              <div className={EffectLibraryPresenter.cardGridClass}>
                {basics.map((item) => (
                  <div key={catalogKey(item)} className="workshop-card flex h-full flex-col gap-2 p-2.5">
                    <span className="relative isolate block aspect-video overflow-hidden rounded-md bg-stone-950 text-amber-300 ring-1 ring-stone-900/10">
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(251,191,36,0.34),transparent_34%),linear-gradient(135deg,rgba(120,113,108,0.2),rgba(28,25,23,0.96))]" />
                      <EffectGlyph
                        item={item}
                        className="workshop-stage relative h-full w-full text-amber-300"
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950/65 via-stone-950/20 to-transparent" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">
                        {catalogName(item)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Built for lighting the table, not decorating an asset bin.
                      </p>
                    </div>
                    <div className="mt-auto">
                      <PlaceEffectButton
                        item={item}
                        returnTo={returnTo}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {tab === "reports" ? (
            admin ? (
              <ModerationQueue onSelectEffect={(id) => update("effect", id)} />
            ) : (
              <p>Reports are available to moderators.</p>
            )
          ) : tab === "mine" && !isAuthenticated ? (
            <div className="workshop-card py-10 text-center">
              <h2 className="text-lg font-medium">
                Your next creation starts here.
              </h2>
              <p className="my-3 text-sm text-muted-foreground">
                Sign in to keep your effects across devices. You can try the
                studio now.
              </p>
              <Button asChild className="workshop-primary">
                <Link
                  to={newEffectPath(
                    returnTo ?? undefined,
                    `/effects?${params}`,
                  )}
                >
                  Try the studio
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <section aria-labelledby="community-effects-title">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="workshop-eyebrow">
                      {search
                        ? "Search results"
                        : tab === "mine"
                          ? "Your creations"
                          : "From the workshop & community"}
                    </p>
                    <h2 id="community-effects-title" className="text-lg font-semibold tracking-tight">
                      {tab === "mine" ? "Saved effects" : "Browse effects"}
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sort === "name" ? "Name A-Z" : "Newest first"}
                  </span>
                </div>
                <ul className={EffectLibraryPresenter.cardGridClass}>
                  {result.results.map((effect) => (
                    <li
                      key={effect._id}
                      style={{
                        contentVisibility: "auto",
                        containIntrinsicSize: "auto 250px",
                      }}
                    >
                      <EffectCard
                        effect={effect}
                        selected={selected === effect._id}
                        mine={user?.id === effect.authorId}
                        onSelect={(id) => update("effect", id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
              {result.status === "LoadingFirstPage" ? (
                <p role="status" className="py-8 text-muted-foreground">
                  Loading effects…
                </p>
              ) : showEmptyState ? (
                <div className="workshop-card mt-4 py-10 text-center">
                  <h2 className="text-lg font-medium">
                    No lighting effects found.
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    This shelf is for lighting, atmosphere, magic, and table geometry - not a generic asset dump.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {search ? (
                      <Button
                        type="button"
                        className="workshop-primary"
                        onClick={clearSearch}
                      >
                        Clear search
                      </Button>
                    ) : null}
                    {activeCategory || sort !== "newest" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearAllBrowseFilters}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                    {!search && !activeCategory && sort === "newest" ? (
                      <Button asChild className="workshop-primary">
                        <Link
                          to={newEffectPath(
                            returnTo ?? undefined,
                            `/effects?${params}`,
                          )}
                        >
                          Create effect
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {result.status === "CanLoadMore" ? (
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => result.loadMore(EffectLibraryPresenter.pageSize)}
                >
                  Load more
                </Button>
              ) : null}
            </>
          )}
        </main>
        {selected ? (
          <aside
            aria-label="Effect preview"
            className="flex w-full shrink-0 flex-col overflow-hidden border-l bg-card/30 lg:w-[min(36vw,430px)] xl:w-[min(34vw,460px)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b bg-background/95 p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-amber-500" /> Preview & tune
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update("effect", null)}
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain pb-16">
            <EffectDetail
              key={selected}
              effectId={selected}
              returnTo={returnTo}
              userId={user?.id ?? null}
              isAdmin={admin}
              onDeleted={() => update("effect", null)}
            />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
