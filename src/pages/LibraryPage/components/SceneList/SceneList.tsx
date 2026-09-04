import { Clock, Layers, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  countLabel,
  formatRelativeTime,
  handleActivateKey,
  openLibraryScene,
} from "@/pages/LibraryPage/helpers";
import type { Doc } from "../../../../../convex/_generated/dataModel";

interface SceneListProps {
  scenes: Array<Doc<"scenes">>;
}

export function SceneList({ scenes }: SceneListProps) {
  const navigate = useNavigate();
  const openScene = (sceneId: string) => openLibraryScene(navigate, sceneId);

  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50">
      {scenes.map((scene, index) => (
        <div
          key={scene._id}
          role="button"
          tabIndex={0}
          onClick={() => openScene(scene._id)}
          onKeyDown={(event) => handleActivateKey(event, () => openScene(scene._id))}
          className="flex cursor-pointer items-center gap-4 px-4 py-3 animate-fade-slide-up transition-colors hover:bg-muted/50"
          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
          <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={scene.mapUrl}
              alt={scene.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{scene.name}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-5 text-xs text-muted-foreground">
            <span
              className="inline-flex items-center gap-1.5"
              title={countLabel(scene.lights.length, "light")}>
              <Lightbulb className="h-3.5 w-3.5" />
              {scene.lights.length}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              title={countLabel(scene.presets.length, "preset")}>
              <Layers className="h-3.5 w-3.5" />
              {scene.presets.length}
            </span>
            <span
              className="inline-flex w-20 items-center justify-end gap-1.5 tabular-nums"
              title={new Date(scene.updatedAt).toLocaleString()}>
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(scene.updatedAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
