import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function Loading({ className, size = 'md' }: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-atlas-600', sizes[size])} />
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <Loading size="lg" />
    </div>
  );
}