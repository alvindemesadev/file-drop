'use client';

import { useEffect, useState } from 'react';

export function useCountdown(expiresAt?: string): string | null {
  const [formatted, setFormatted] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!expiresAt) {
      setFormatted(null);
      return;
    }

    const expiry = expiresAt;
    function tick() {
      const remaining = new Date(expiry).getTime() - Date.now();

      if (remaining <= 0) {
        setFormatted('Expired');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setFormatted(`Expires in ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setFormatted(`Expires in ${minutes}m ${seconds}s`);
      } else {
        setFormatted(`Expires in ${seconds}s`);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return formatted;
}
