import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

type InputProps = TextInputProps & { className?: string; invalid?: boolean };

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, invalid, editable = true, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      editable={editable}
      placeholderTextColor="#94a3b8"
      selectionColor={colors.teal}
      className={cn(
        "h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-ink",
        invalid && "border-red-400",
        !editable && "opacity-60",
        className,
      )}
      {...props}
    />
  );
});
