import { WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DmOfflineCardProps {
  sceneName: string;
}

export function DmOfflineCard({ sceneName }: DmOfflineCardProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <WifiOff className="mx-auto mb-2 size-12 text-muted-foreground" />
          <CardTitle>DM is Offline</CardTitle>
          <CardDescription>
            The DM for <span className="font-medium text-foreground">{sceneName}</span> is not
            currently online. You can only join when the DM is viewing the scene.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">
            This page will automatically detect when the DM comes online.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
