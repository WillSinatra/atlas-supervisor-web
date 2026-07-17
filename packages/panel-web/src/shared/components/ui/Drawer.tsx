import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[480px]',
};

export function Drawer({ open, onClose, title, children, side = 'right', size = 'md' }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn('relative ml-auto h-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700', sizes[size])}
          >
            {title && (
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            )}
            <div className="p-5 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}