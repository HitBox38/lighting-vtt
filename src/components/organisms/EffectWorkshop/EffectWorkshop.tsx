import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { usePostHog } from "@posthog/react";
import { X, Plus, EyeOff, Lock, Search } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EffectGlyph } from "@/components/molecules/EffectGlyph/EffectGlyph";
import { useWorkshopStore } from "@/stores/workshopStore";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";
import { useUIPreferencesStore } from "@/stores/uiPreferencesStore";
import { useEffectRuntimeStore } from "@/stores/effectRuntimeStore/effectRuntimeStore";
import {
  BASICS,
  LIGHT_NAMES,
  catalogKey,
  catalogName,
  type CatalogItem,
  type SceneSelection,
} from "@/lib/effects/catalog";
import { effectLibraryPath, newEffectPath } from "@/lib/effects/routes";
import {
  effectRefKey,
  useEffectDefinitions,
} from "@/lib/effects/hooks/useEffectDefinitions";
import { SceneObjectInspector } from "./SceneObjectInspector";
import { describeEffectStatus } from "@/components/molecules/EffectContextMenu/helpers";

class CatalogBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="rounded-lg border p-3 text-sm text-muted-foreground">
        Community effects are unavailable. Built-in tools still work.{" "}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => this.setState({ failed: false })}
        >
          Retry
        </Button>
      </p>
    ) : (
      this.props.children
    );
  }
}

function CatalogResults({
  search,
  mine,
  includeMine = false,
  onChoose,
}: {
  search: string;
  mine: boolean;
  includeMine?: boolean;
  onChoose: (item: CatalogItem) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const result = usePaginatedQuery(
    api.effects.browse,
    mine && !isAuthenticated ? "skip" : { search, mine },
    { initialNumItems: 24 },
  );
  const own = usePaginatedQuery(
    api.effects.browse,
    includeMine && isAuthenticated ? { search, mine: true } : "skip",
    { initialNumItems: 24 },
  );
  const choices = [
    ...new Map(
      [...result.results, ...own.results].map((effect) => [effect._id, effect]),
    ).values(),
  ];
  if (mine && !isAuthenticated)
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to access your authored effects. You can use the built-ins above
        now.
      </p>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((effect) => {
          const item: CatalogItem = {
            kind: "effect",
            effectId: effect._id,
            version: effect.latestVersion,
            name: effect.name,
          };
          return (
            <button
              type="button"
              className="workshop-card text-left"
              key={effect._id}
              onClick={() => onChoose(item)}
            >
              {effect.thumbnailUrl ? (
                <img
                  src={effect.thumbnailUrl}
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                  className="aspect-video w-full rounded-md object-cover"
                />
              ) : (
                <EffectGlyph
                  item={item}
                  className="h-20 w-full text-amber-500"
                />
              )}
              <span className="block truncate text-sm font-medium">
                {effect.name}
              </span>
              <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                {effect.description}
              </span>
            </button>
          );
        })}
      </div>
      {result.status === "LoadingFirstPage" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading effects…
        </p>
      ) : choices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching effects.</p>
      ) : null}
      {result.status === "CanLoadMore" || own.status === "CanLoadMore" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (result.status === "CanLoadMore") result.loadMore(24);
            if (own.status === "CanLoadMore") own.loadMore(24);
          }}
        >
          Load more
        </Button>
      ) : null}
    </>
  );
}

function SceneObjects({ search }: { search: string }) {
  const lights = useLightStore((s) => s.lights);
  const mirrors = useLightStore((s) => s.mirrors);
  const effects = useLightStore((s) => s.effects);
  const sceneId = useLightStore((s) => s.sceneId);
  const { definitions } = useEffectDefinitions(effects, sceneId);
  const statuses = useEffectRuntimeStore((s) => s.statuses);
  const select = useWorkshopStore((s) => s.select);
  const rows = useMemo(
    () => [
      ...lights.map((item, i) => ({
        ...item,
        ref: { kind: "light", id: item.id } as SceneSelection,
        name: `${LIGHT_NAMES[item.type]} ${i + 1}`,
        typeLabel: "Built-in light",
      })),
      ...mirrors.map((item, i) => ({
        ...item,
        ref: { kind: "mirror", id: item.id } as SceneSelection,
        name: `Mirror ${i + 1}`,
        typeLabel: "Reflection",
      })),
      ...effects.map((item) => ({
        ...item,
        ref: { kind: "effect", id: item.id } as SceneSelection,
        name:
          definitions.get(effectRefKey(item.effectId, item.version))?.name ??
          "Effect",
        typeLabel: `Effect · v${item.version}`,
      })),
    ],
    [lights, mirrors, effects, definitions],
  );
  const filtered = rows.filter((row) =>
    `${row.name} ${row.typeLabel}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-2">
      {filtered.map((row) => (
        <button
          key={`${row.ref.kind}:${row.id}`}
          className="workshop-card flex w-full items-center gap-2 text-left"
          onClick={() => select(row.ref)}
        >
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {row.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.typeLabel}
              {row.ref.kind === "effect"
                ? ` · ${describeEffectStatus(statuses[row.id]).label}`
                : ""}
            </span>
          </div>
          {row.hidden ? (
            <EyeOff className="size-4" aria-label="Hidden from players" />
          ) : null}
          {row.locked ? <Lock className="size-4" aria-label="Locked" /> : null}
        </button>
      ))}
      {!filtered.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {rows.length
            ? "No objects match your search."
            : "Your lighting starts here. Add a light, mirror, or effect."}
        </p>
      ) : null}
    </div>
  );
}

export function EffectWorkshop() {
  const { open, tab, selection, recent, setOpen, setTab, begin } =
    useWorkshopStore();
  const side = useUIPreferencesStore((s) => s.sidebarSide);
  const location = useLocation();
  const posthog = usePostHog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);
  const choose = (item: CatalogItem) => {
    useTokenStore.getState().setPlacementTemplateId(null);
    posthog.capture("effect_placement_started", {
      kind: item.kind,
      source: "palette",
    });
    begin(item);
  };
  if (!open) return null;
  const returnTo = `${location.pathname}${location.search}`;
  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label="Effect workshop"
      className={`workshop-panel absolute bottom-3 top-20 z-30 flex w-[380px] max-w-[calc(100%-1.5rem)] flex-col outline-none ${side === "right" ? "left-3" : "right-3"}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
          document.getElementById("workshop-trigger")?.focus();
        }
      }}
    >
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <p className="workshop-eyebrow">Lighting workbench</p>
          <h2 className="text-lg font-semibold">Effects</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close effects"
          onClick={() => {
            setOpen(false);
            document.getElementById("workshop-trigger")?.focus();
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1 border-b p-2">
        {(["add", "scene"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "secondary" : "ghost"}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "add" ? "Add" : "In scene"}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {selection && tab === "scene" ? (
          <SceneObjectInspector selection={selection} />
        ) : (
          <div className="space-y-5 p-4">
            {tab === "add" ? (
              <>
                <div>
                  <p className="workshop-eyebrow mb-2">
                    Basics · ready to place
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {BASICS.map((item) => (
                      <button
                        type="button"
                        key={catalogKey(item)}
                        className="workshop-card px-1 text-center"
                        onClick={() => choose(item)}
                      >
                        <EffectGlyph
                          item={item}
                          className="w-full text-amber-500"
                        />
                        <span className="text-[11px] font-medium">
                          {catalogName(item)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {recent.length ? (
                  <div>
                    <p className="workshop-eyebrow mb-2">Recently placed</p>
                    <div className="flex flex-wrap gap-1">
                      {recent.map((item) => (
                        <Button
                          key={catalogKey(item)}
                          variant="outline"
                          size="sm"
                          className="max-w-full truncate text-xs"
                          onClick={() => choose(item)}
                        >
                          {catalogName(item)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                aria-label="Search workshop"
                placeholder={
                  tab === "scene" ? "Find an object…" : "Find an effect…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {tab === "scene" ? (
              <SceneObjects search={search} />
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
                  {["all", "built-in", "community", "mine"].map((f) => (
                    <Button
                      size="sm"
                      key={f}
                      variant={f === filter ? "secondary" : "ghost"}
                      aria-pressed={filter === f}
                      className="text-xs capitalize"
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
                {filter === "built-in" ? (
                  <p className="text-sm text-muted-foreground">
                    The four Basics above are always available, including
                    offline.
                  </p>
                ) : (
                  <CatalogBoundary key={filter}>
                    <CatalogResults
                      search={search}
                      mine={filter === "mine"}
                      includeMine={filter === "all"}
                      onChoose={choose}
                    />
                  </CatalogBoundary>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to={effectLibraryPath(returnTo)}>
                    Open gallery & tune a preview
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <Button asChild className="workshop-primary w-full">
          <Link to={newEffectPath(returnTo)}>
            <Plus className="size-4" /> Create effect
          </Link>
        </Button>
      </div>
    </aside>
  );
}
