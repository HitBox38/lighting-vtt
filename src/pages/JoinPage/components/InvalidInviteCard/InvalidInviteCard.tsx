import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InvalidInviteCard() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldAlert className="mx-auto mb-2 size-12 text-destructive" />
          <CardTitle>Invalid Invite Link</CardTitle>
          <CardDescription>
            This invite link is not valid or has expired. Ask the DM for a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
