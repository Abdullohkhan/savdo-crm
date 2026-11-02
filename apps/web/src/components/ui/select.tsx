import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Oddiy native select — telefonda eng qulay */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm',
        className,
      )}
      {...props}
    />
  );
}
