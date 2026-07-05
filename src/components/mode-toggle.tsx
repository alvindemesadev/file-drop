'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 block dark:hidden" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
