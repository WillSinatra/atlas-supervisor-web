import { MapPin } from 'lucide-react';

type LogoSize = 'sm' | 'md' | 'lg';

const sizes: Record<LogoSize, { container: string; icon: string; text: string }> = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-sm' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-base' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-lg' },
};

interface LogoProps {
  size?: LogoSize;
  collapsed?: boolean;
  /** 'onDark' forces white text for use on permanently dark surfaces (e.g. the sidebar). 'themed' follows the light/dark theme. */
  variant?: 'themed' | 'onDark';
}

export function Logo({ size = 'md', collapsed = false, variant = 'themed' }: LogoProps) {
  const s = sizes[size];
  const titleColor = variant === 'onDark' ? 'text-white' : 'text-slate-900 dark:text-white';
  const subtitleColor = variant === 'onDark' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="flex items-center gap-3">
      <div className={`${s.container} rounded-xl bg-atlas-600 flex items-center justify-center flex-shrink-0`}>
        <MapPin className={`${s.icon} text-white`} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <h2 className={`${s.text} font-semibold ${titleColor} truncate`}>Atlas</h2>
          <p className={`text-[10px] ${subtitleColor} truncate`}>Supervisor</p>
        </div>
      )}
    </div>
  );
}