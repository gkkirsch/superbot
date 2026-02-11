import { useState } from "react";
import { cn } from "@/components/lib/utils";

export const Tabs = ({ value, onValueChange, children, className, ...props }) => {
  const [internalValue, setInternalValue] = useState(value || "");
  const currentValue = value !== undefined ? value : internalValue;
  
  return (
    <div className={cn("w-full", className)} {...props}>
      {typeof children === "function"
        ? children({ value: currentValue, onValueChange: onValueChange || setInternalValue })
        : children}
    </div>
  );
};
Tabs.displayName = "Tabs";

export const TabsList = ({ className, ...props }) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      className
    )}
    {...props}
  />
);
TabsList.displayName = "TabsList";

export const TabsTrigger = ({ value, onClick, className, ...props }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
      "data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm data-[state=active]:focus-visible:ring-2 dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-slate-50",
      className
    )}
    data-state="active"
    {...props}
  />
);
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = ({ value, className, ...props }) => (
  <div
    className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
      className
    )}
    {...props}
  />
);
TabsContent.displayName = "TabsContent";
