import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
      type: {
        color: "",
        studentstatus: "",
        studenttype: "",
        grade: "",
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
      type: "default",
    },
  },
);

// 텍스트 내용에 따른 색상 결정 함수
const getColorByText = (text: string, type: string) => {
  const lowerText = text.toLowerCase();
  
  switch (type) {
    case 'studentstatus':
      switch (lowerText) {
        case '재원':
          return 'bg-green-100 text-green-800 border-green-200';
        case '휴원':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case '퇴원':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    
    case 'studenttype':
      switch (lowerText) {
        case '체험':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case '일반1':
          return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case '일반2':
          return 'bg-cyan-100 text-cyan-800 border-cyan-200';
        case '스페셜':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    
    case 'grade':
      // 6세, 7세
      if (lowerText.includes('6세') || lowerText.includes('7세')) {
        return 'bg-pink-100 text-pink-800 border-pink-200';
      } 
      // 초3
      else if (lowerText.includes('초3')) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      }
      // 초4-초6
      else if (lowerText.includes('초4') || lowerText.includes('초5') || lowerText.includes('초6')) {
        return 'bg-green-100 text-green-800 border-green-200';
      }
      // 중1-중3
      else if (lowerText.includes('중1') || lowerText.includes('중2') || lowerText.includes('중3')) {
        return 'bg-purple-100 text-purple-800 border-purple-200';
      }
      // 고1-성인 (고등학교 포함)
      else if (lowerText.includes('고1') || lowerText.includes('고2') || lowerText.includes('고3') || lowerText.includes('성인')) {
        return 'bg-orange-100 text-orange-800 border-orange-200';
      }
      // 기타 초등학교 (초1, 초2)
      else if (lowerText.includes('초')) {
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      }
      else {
        return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    
    case 'color':
      // 직접 색상 지정용
      return text;
    
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

function Badge({
  className,
  variant,
  type = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { 
    asChild?: boolean;
    type?: "color" | "studentstatus" | "studenttype" | "grade" | "default";
  }) {
  const Comp = asChild ? Slot : "span";
  
  // type이 지정되고 children이 문자열인 경우 색상 결정
  const colorClass = type !== "default" && typeof children === "string" 
    ? getColorByText(children, type)
    : "";

  return (
    <Comp
      data-slot="badge"
      className={cn(
        badgeVariants({ variant, type }), 
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
