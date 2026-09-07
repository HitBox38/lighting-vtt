import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useUser,
  UserButton,
  Show,
  SignInButton,
} from "@clerk/react";
import { useConvexAuth, usePaginatedQuery, useQuery } from "convex/react";
import { usePostHog } from "@posthog/react";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EffectGlyph } from "@/components/molecules/EffectGlyph/EffectGlyph";
import { PlaceEffectButton } from "@/components/molecules/PlaceEffectButton/PlaceEffectButton";
import { EffectCard } from "./components/EffectCard";
import { EffectDetail } from "./components/EffectDetail";
import { ModerationQueue } from "./components/ModerationQueue";
import { BASICS, catalogKey, catalogName } from "@/lib/effects/catalog";
import {
  newEffectPath,
  RETURN_TO_PARAM,
  sanitizeReturnTo,
} from "@/lib/effects/routes";
import { EFFECT_CATEGORIES, effectCategorySchema } from "@shared/effects";

export function EffectLibraryPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const posthog = usePostHog();
  const returnTo = sanitizeReturnTo(params.get(RETURN_TO_PARAM));
  const selected = params.get("effect");
  const tab = params.get("tab") ?? "public";
  const search = params.get("q") ?? "";
  const category = effectCategorySchema.safeParse(params.get("category"));
  const admin =
    useQuery(api.effects.amAdmin, isAuthenticated ? {} : "skip") ?? false;
  const result = usePaginatedQuery(
    api.effects.browse,
    tab === "reports" || (tab === "mine" && !isAuthenticated)
      ? "skip"
      : {
          search,
          mine: tab === "mine",
          category: category.success ? category.data : undefined,
        },
    { initialNumItems: 24 },
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
  useEffect(() => {
    posthog.capture("effect_library_viewed", { from_scene: Boolean(returnTo) });
  }, [posthog, returnTo]);
  const basics = BASICS.filter((item) =>
    catalogName(item).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 sm:px-6">
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
        <div className="flex items-center gap-3">
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {[
                ["public", "Explore"],
                ["mine", "My effects"],
                ...(admin ? [["reports", "Reports"]] : []),
              ].map(([value, label]) => (
                <Button
                  size="sm"
                  variant={tab === value ? "secondary" : "ghost"}
                  aria-pressed={tab === value}
                  key={value}
                  onClick={() => update("tab", value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Input
              className="ml-auto w-full sm:w-64"
              aria-label="Search effects"
              placeholder="Search effects or creators…"
              value={search}
              onChange={(e) => update("q", e.target.value, true)}
            />
          </div>
          {tab !== "reports" ? (
            <div className="mb-6 flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={!category.success ? "secondary" : "ghost"}
                aria-pressed={!category.success}
                onClick={() => update("category", null)}
              >
                All
              </Button>
              {EFFECT_CATEGORIES.map((c) => (
                <Button
                  size="sm"
                  key={c}
                  variant={
                    category.success && category.data === c
                      ? "secondary"
                      : "ghost"
                  }
                  aria-pressed={category.success && category.data === c}
                  onClick={() => update("category", c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          ) : null}
          {tab === "public" &&
          (!category.success || category.data === "Light") &&
          basics.length ? (
            <section className="mb-8">
              <p className="workshop-eyebrow mb-3">Built-in essentials</p>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {basics.map((item) => (
                  <div key={catalogKey(item)} className="workshop-card">
                    <EffectGlyph
                      item={item}
                      className="h-16 w-full text-amber-500"
                    />
                    <h2 className="mb-3 text-sm font-medium">
                      {catalogName(item)}
                    </h2>
                    <PlaceEffectButton item={item} returnTo={returnTo} />
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
              <Button asChild>
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
              <p className="workshop-eyebrow mb-3">
                {search
                  ? "Search results"
                  : tab === "mine"
                    ? "Your creations"
                    : "From the workshop & community"}
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {result.results.map((effect) => (
                  <li
                    key={effect._id}
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "auto 260px",
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
              {result.status === "LoadingFirstPage" ? (
                <p role="status" className="py-8 text-muted-foreground">
                  Loading effects…
                </p>
              ) : !result.results.length ? (
                <p className="py-8 text-muted-foreground">
                  {search
                    ? "No effects match. Try another name or clear the filters."
                    : "No effects here yet. Start with a template in the studio."}
                </p>
              ) : null}
              {result.status === "CanLoadMore" ? (
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => result.loadMore(24)}
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
            className="w-full shrink-0 overflow-y-auto border-l bg-card/30 lg:w-[min(45vw,560px)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 p-3">
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
            <EffectDetail
              key={selected}
              effectId={selected}
              returnTo={returnTo}
              userId={user?.id ?? null}
              isAdmin={admin}
              onDeleted={() => update("effect", null)}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
