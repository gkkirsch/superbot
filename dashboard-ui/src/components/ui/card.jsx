export const Card = ({ className, ...props }) => (
  <div
    className={`rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm ${className || ""}`}
    {...props}
  />
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }) => (
  <div
    className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
    {...props}
  />
);
CardHeader.displayName = "CardHeader";

export const CardFooter = ({ className, ...props }) => (
  <div
    className={`flex items-center p-6 pt-0 ${className || ""}`}
    {...props}
  />
);
CardFooter.displayName = "CardFooter";

export const CardTitle = ({ className, ...props }) => (
  <h2
    className={`text-2xl font-semibold leading-none tracking-tight ${className || ""}`}
    {...props}
  />
);
CardTitle.displayName = "CardTitle";

export const CardDescription = ({ className, ...props }) => (
  <p className={`text-sm text-slate-500 ${className || ""}`} {...props} />
);
CardDescription.displayName = "CardDescription";

export const CardContent = ({ className, ...props }) => (
  <div className={`p-6 pt-0 ${className || ""}`} {...props} />
);
CardContent.displayName = "CardContent";
