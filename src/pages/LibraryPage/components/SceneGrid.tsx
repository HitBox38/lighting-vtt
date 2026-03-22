import { Card } from "@/components/ui/card";
import { setSceneEntrySource } from "@/lib/analytics";
import { Lightbulb, Layers, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../helpers";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface SceneGridProps {
  scenes: Array<Doc<"scenes">>;
}

export const SceneGrid = ({ scenes }: SceneGridProps) => {
  const navigate = useNavigate();
  const openScene = (sceneId: string) => {
    setSceneEntrySource("library");
    navigate(`/scene?id=${encodeURIComponent(sceneId)}`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {scenes.map((scene, index) => (
        <Card
          key={scene._id}
          onClick={() => openScene(scene._id)}
          className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-primary/25 hover:-translate-y-0.5 border border-border/50 p-0 gap-0 animate-fade-slide-up"
          style={{
            animationDelay: `${Math.min(index * 50, 500)}ms`,
          }}>
          <div className="relative aspect-video overflow-hidden bg-muted">
            <img
              src={scene.mapUrl}
              alt={scene.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="p-3 space-y-2">
            <h3 className="text-sm font-semibold tracking-tight truncate" title={scene.name}>
              {scene.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span
                className="inline-flex items-center gap-1"
                title={`${scene.lights.length} light${scene.lights.length !== 1 ? "s" : ""}`}>
                <Lightbulb className="w-3 h-3" />
                {scene.lights.length}
              </span>
              <span
                className="inline-flex items-center gap-1"
                title={`${scene.presets.length} preset${scene.presets.length !== 1 ? "s" : ""}`}>
                <Layers className="w-3 h-3" />
                {scene.presets.length}
              </span>
              <span
                className="inline-flex items-center gap-1 ml-auto"
                title={new Date(scene.updatedAt).toLocaleString()}>
                <Clock className="w-3 h-3" />
                {formatRelativeTime(scene.updatedAt)}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
