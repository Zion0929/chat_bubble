import React from 'react';

export const Button = React.forwardRef(
  ({ className = "", variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    // 基础样式
    let baseStyle = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50";
    
    // 变体样式
    let variantStyle = "";
    switch (variant) {
      case 'default':
        variantStyle = "bg-[#84A98C] text-white hover:bg-[#6B9080] shadow-sm";
        break;
      case 'outline':
        variantStyle = "border border-[#84A98C]/40 bg-white text-[#84A98C] hover:bg-[#CCE8C6]/20 hover:text-[#52796F] shadow-sm";
        break;
      case 'destructive':
        variantStyle = "bg-red-500 text-white hover:bg-red-600 shadow-sm";
        break;
      case 'secondary':
        variantStyle = "bg-[#CCE8C6] text-[#2D3A3A] hover:bg-[#CCE8C6]/80 shadow-sm";
        break;
      case 'ghost':
        variantStyle = "hover:bg-[#CCE8C6]/20 hover:text-[#52796F]";
        break;
      case 'link':
        variantStyle = "text-[#84A98C] underline-offset-4 hover:underline";
        break;
    }
    
    // 尺寸样式
    let sizeStyle = "";
    switch (size) {
      case 'default':
        sizeStyle = "h-9 px-4 py-2";
        break;
      case 'sm':
        sizeStyle = "h-8 rounded-md px-3 text-xs";
        break;
      case 'lg':
        sizeStyle = "h-10 rounded-md px-8";
        break;
      case 'icon':
        sizeStyle = "h-9 w-9";
        break;
    }
    
    const combinedClassName = `${baseStyle} ${variantStyle} ${sizeStyle} ${className}`;
    
    return (
      <button
        className={combinedClassName}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// 为了兼容性，保留 buttonVariants 导出
export const buttonVariants = (options) => {
  const { variant = "default", size = "default", className = "" } = options || {};
  
  // 基础样式
  let baseStyle = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50";
  
  // 变体样式
  let variantStyle = "";
  switch (variant) {
    case 'default':
      variantStyle = "bg-[#84A98C] text-white hover:bg-[#6B9080] shadow-sm";
      break;
    case 'outline':
      variantStyle = "border border-[#84A98C]/40 bg-white text-[#84A98C] hover:bg-[#CCE8C6]/20 hover:text-[#52796F] shadow-sm";
      break;
    case 'destructive':
      variantStyle = "bg-red-500 text-white hover:bg-red-600 shadow-sm";
      break;
    case 'secondary':
      variantStyle = "bg-[#CCE8C6] text-[#2D3A3A] hover:bg-[#CCE8C6]/80 shadow-sm";
      break;
    case 'ghost':
      variantStyle = "hover:bg-[#CCE8C6]/20 hover:text-[#52796F]";
      break;
    case 'link':
      variantStyle = "text-[#84A98C] underline-offset-4 hover:underline";
      break;
  }
  
  // 尺寸样式
  let sizeStyle = "";
  switch (size) {
    case 'default':
      sizeStyle = "h-9 px-4 py-2";
      break;
    case 'sm':
      sizeStyle = "h-8 rounded-md px-3 text-xs";
      break;
    case 'lg':
      sizeStyle = "h-10 rounded-md px-8";
      break;
    case 'icon':
      sizeStyle = "h-9 w-9";
      break;
  }
  
  return `${baseStyle} ${variantStyle} ${sizeStyle} ${className}`;
}; 