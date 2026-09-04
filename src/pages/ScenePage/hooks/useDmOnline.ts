import { useEffect, useState } from "react";

import { getDmLastSeen, isDmRecentlySeen } from "@/pages/ScenePage/helpers";

export function useDmOnline(scene: unknown) {
  const dmLastSeenTimestamp = getDmLastSeen(scene);
  const [dmOnline, setDmOnline] = useState(false);

  useEffect(() => {
    const check = () => {
      setDmOnline(isDmRecentlySeen(dmLastSeenTimestamp, Date.now()));
    };
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, [dmLastSeenTimestamp]);

  return dmOnline;
}
