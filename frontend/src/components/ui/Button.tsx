import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyle = "level-button relative isolate flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-lg font-sans font-semibold tracking-wide transition-[color,background-color,border-color,box-shadow,filter,transform] duration-200 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none";
  
  const variants = {
    primary: "level-button--primary bg-primary text-on-primary shadow-sm",
    secondary: "level-button--secondary border border-outline-variant bg-surface-container text-on-surface",
    danger: "level-button--danger border border-error/30 bg-error/15 text-error",
    ghost: "level-button--ghost bg-transparent text-muted",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[11px] h-8",
    md: "px-4 py-2 text-xs h-10",
    lg: "px-6 py-3 text-sm h-12",
  };

  return (
    <button
      data-variant={variant}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
