
import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "./dialog"
import { Button } from "./button"
import { Loader2 } from "lucide-react"
import { cn } from "../lib/utils"

export interface EnhancedDialogProps extends React.ComponentProps<typeof Dialog> {
    trigger?: React.ReactNode
    title: React.ReactNode
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
    primaryAction?: {
        label: string
        onClick: () => void
        disabled?: boolean
        loading?: boolean
        variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
        className?: string
    }
    secondaryAction?: {
        label?: string
        onClick?: () => void
        disabled?: boolean
        className?: string
    }
    className?: string
    size?: "sm" | "md" | "lg" | "xl" | "full"
}

const sizeClasses = {
    sm: "sm:max-w-[425px]",
    md: "sm:max-w-[600px]",
    lg: "sm:max-w-[800px]",
    xl: "sm:max-w-[1000px]",
    full: "w-[95vw] h-[95vh] max-w-none"
}

export function EnhancedDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    children,
    footer,
    primaryAction,
    secondaryAction,
    className,
    size = "md",
    ...props
}: EnhancedDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange} {...props}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className={cn(
                "p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh]",
                size === "full" ? "h-[95vh]" : "h-auto",
                sizeClasses[size],
                className
            )}>
                <DialogHeader className="p-6 pb-4 border-b bg-blue-50/50 border-blue-100 shrink-0">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-blue-950">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-blue-900/60 mt-1">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="p-6 bg-white overflow-y-auto flex-1 min-h-0">
                    {children}
                </div>

                {(footer || primaryAction || secondaryAction) && (
                    <DialogFooter className="p-6 pt-4 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2">
                        {footer ? (
                            footer
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn("border-slate-300", secondaryAction?.className)}
                                    disabled={secondaryAction?.disabled || primaryAction?.loading}
                                    onClick={() => {
                                        if (secondaryAction?.onClick) {
                                            secondaryAction.onClick();
                                        } else {
                                            onOpenChange?.(false);
                                        }
                                    }}
                                >
                                    {secondaryAction?.label || "Cancel"}
                                </Button>
                                {primaryAction && (
                                    <Button
                                        type="button"
                                        variant={primaryAction.variant || "default"}
                                        className={cn("bg-blue-600 hover:bg-blue-700 text-white", primaryAction.className)}
                                        disabled={primaryAction.disabled || primaryAction.loading}
                                        onClick={primaryAction.onClick}
                                    >
                                        {primaryAction.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        {primaryAction.label}
                                    </Button>
                                )}
                            </>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

