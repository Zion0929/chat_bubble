import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const EnhancedButton: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "default",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  // 基础样式
  const baseClasses = "button-enhanced relative inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none overflow-hidden";
  
  // 尺寸样式
  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  // 变体样式
  const variantClasses = {
    default: "bg-[#F5F7F5] text-[#2D3A3A] border border-[#84A98C]/20 hover:bg-[#F5F7F5]/90 shadow-sm",
    outline: "border border-[#84A98C]/60 text-[#84A98C] hover:text-[#52796F] hover:bg-[#CCE8C6]/40 hover:border-[#84A98C]",
    primary: "bg-[#84A98C] text-white hover:bg-[#6B9080] shadow-sm",
    secondary: "bg-[#CCE8C6] text-[#2D3A3A] hover:bg-[#CCD5AE] shadow-sm",
    ghost: "text-[#84A98C] hover:bg-[#CCE8C6]/20 hover:text-[#52796F]",
    link: "text-[#84A98C] underline hover:text-[#52796F]"
  };
  
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center bg-inherit">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
      
      <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : ''}`}>
        {leftIcon && <span className="icon-wrapper">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="icon-wrapper">{rightIcon}</span>}
      </span>
      
      {/* 光泽效果 */}
      <span className="shine-effect"></span>
    </button>
  );
}; 