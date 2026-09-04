import { Card } from "@/components/ui/card";
import { Clock, Layers, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  countLabel,
  formatRelativeTime,
  handleActivateKey,
  openLibraryScene,
} from "@/pages/LibraryPage/helpers";
import type { Doc } from "../../../../../convex/_generated/dataModel";

interface SceneGridProps {
  scenes: Array<Doc<"scenes">>;
}

export function SceneGrid({ scenes }: SceneGridProps) {
  const navigate = useNavigate();
  const openScene = (sceneId: string) => openLibraryScene(navigate, sceneId);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {scenes.map((scene, index) => (
        <Card
          key={scene._id}
          role="button"
          tabIndex={0}
          onClick={() => openScene(scene._id)}
          onKeyDown={(event) => handleActivateKey(event, () => openScene(scene._id))}
          className="group relative cursor-pointer gap-0 overflow-hidden border border-border/50 p-0 animate-fade-slide-up transition-shadow duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/25"
          style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}>
          <div className="relative aspect-video overflow-hidden bg-muted">
            <img
              src={scene.mapUrl}
              alt={scene.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="space-y-2 p-3">
            <h3 className="truncate text-sm font-semibold tracking-tight" title={scene.name}>
              {scene.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span
                className="inline-flex items-center gap-1"
                title={countLabel(scene.lights.length, "light")}>
                <Lightbulb className="h-3 w-3" />
                {scene.lights.length}
              </span>
              <span
                className="inline-flex items-center gap-1"
                title={countLabel(scene.presets.length, "preset")}>
                <Layers className="h-3 w-3" />
                {scene.presets.length}
              </span>
              <span
                className="ml-auto inline-flex items-center gap-1"
                title={new Date(scene.updatedAt).toLocaleString()}>
                <Clock className="h-3 w-3" />
                {formatRelativeTime(scene.updatedAt)}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
