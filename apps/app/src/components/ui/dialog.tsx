import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] bottom-0 md:bottom-auto md:top-[50%] z-50 grid w-full max-w-md max-h-[95vh] md:max-h-[85vh] overflow-y-scroll hide-scroll-bars translate-x-[-50%] md:translate-y-[-50%] gap-4 border border-zinc-800 bg-zinc-950 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-bottom-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-bottom-[48%] rounded-tl-[24px] rounded-tr-[24px] md:rounded-[24px]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex w-7 h-7 items-center justify-center bg-zinc-800 rounded-full whitespace-nowrap transition-all hover:scale-105">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          fill="none"
          viewBox="0 0 40 40"
          className="fill-zinc-400 w-3 h-3"
        >
          <g clipPath="url(#clip0_40_3455)">
            <path d="M35.065 40c-1.38 0-2.566-.44-3.535-1.419L20.005 26.996 8.46 38.581C7.471 39.57 6.306 40 4.925 40A4.917 4.917 0 01-.01 35.049c0-1.311.529-2.613 1.45-3.532L12.983 20 1.45 8.464A4.93 4.93 0 010 4.932C0 2.27 2.115 0 4.935 0 6.267 0 7.55.528 8.47 1.448l11.545 11.556L31.53 1.448A5.02 5.02 0 0135.065 0 4.913 4.913 0 0140 4.932c0 1.262-.46 2.563-1.42 3.532L27.016 20 38.58 31.517C39.59 32.525 40 33.718 40 35.049 40 37.759 37.885 40 35.065 40z"></path>
          </g>
          <defs>
            <clipPath id="clip0_40_3455">
              <path d="M0 0H40V40H0z"></path>
            </clipPath>
          </defs>
        </svg>
        <span className="sr-only ">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-bold leading-none tracking-tighter leading-4 text-zinc-50",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-zinc-50", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
