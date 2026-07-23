import React, { forwardRef } from 'react';
import { Icon } from '../../design-system/Icon';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  className?: string;
  fontFamily?: 'sans' | 'mono';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  icon,
  className = '',
  fontFamily = 'sans',
  ...props
}, ref) => {
  const fontClass = fontFamily === 'mono' ? 'font-mono' : 'font-sans';
  
  return (
    <div className="flex flex-col gap-1.5 w-full group">
      {label && (
        <label className="font-sans text-sm font-medium text-on-surface-variant transition-colors duration-200 group-focus-within:text-primary">
          {label}
        </label>
      )}
      <div className="relative flex w-full items-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition-all duration-200 group-focus-within:border-primary group-focus-within:shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]">
        {icon ? <Icon name={icon} className="pointer-events-none absolute left-3 text-[20px] text-muted transition-colors duration-200 group-focus-within:text-primary" /> : null}
        <input
          ref={ref}
          className={`w-full border-none bg-transparent px-3 py-2.5 text-sm text-on-surface placeholder:text-muted/70 focus:outline-none focus:ring-0 ${
            icon ? 'pl-10' : ''
          } ${fontClass} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
});

Input.displayName = 'Input';
