import { Lightbulb, Layers, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../helpers";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface SceneListProps {
  scenes: Array<Doc<"scenes">>;
}

export const SceneList = ({ scenes }: SceneListProps) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
      {scenes.map((scene, index) => (
        <div
          key={scene._id}
          onClick={() => navigate(`/scene?id=${encodeURIComponent(scene._id)}`)}
          className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors animate-fade-slide-up"
          style={{
            animationDelay: `${Math.min(index * 30, 300)}ms`,
          }}>
          <div className="w-20 h-12 rounded-md overflow-hidden bg-muted shrink-0">
            <img
              src={scene.mapUrl}
              alt={scene.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{scene.name}</h3>
          </div>

          <div className="flex items-center gap-5 text-xs text-muted-foreground shrink-0">
            <span
              className="inline-flex items-center gap-1.5"
              title={`${scene.lights.length} light${scene.lights.length !== 1 ? "s" : ""}`}>
              <Lightbulb className="w-3.5 h-3.5" />
              {scene.lights.length}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              title={`${scene.presets.length} preset${scene.presets.length !== 1 ? "s" : ""}`}>
              <Layers className="w-3.5 h-3.5" />
              {scene.presets.length}
            </span>
            <span
              className="inline-flex items-center gap-1.5 w-20 justify-end tabular-nums"
              title={new Date(scene.updatedAt).toLocaleString()}>
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(scene.updatedAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
