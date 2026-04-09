import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Keep menu within viewport
  const menuW = 176;
  const menuH = items.length * 30 + 8;
  const left = Math.min(x, window.innerWidth  - menuW - 8);
  const top  = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-[999] bg-nm-surface border border-nm-border rounded-xl shadow-2xl py-1.5 overflow-hidden"
      style={{ left, top, width: menuW }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="my-1 mx-2 border-t border-nm-border" />;
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors text-left',
              item.danger
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                : 'text-nm-text hover:bg-nm-base',
              item.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {item.icon && <span className="w-3.5 flex-shrink-0 flex items-center justify-center">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
