import * as React from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value?: number | null;
  onValueChange?: (value: number) => void;
  decimals?: boolean;
  allowNegative?: boolean;
}

function toDisplayValue(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return String(value);
}

function sanitizeValue(rawValue: string, decimals: boolean, allowNegative: boolean) {
  let nextValue = rawValue.replace(/[^\d,.-]/g, "");

  if (!allowNegative) {
    nextValue = nextValue.replace(/-/g, "");
  } else if (nextValue.includes("-")) {
    nextValue = `-${nextValue.replace(/-/g, "")}`;
  }

  if (!decimals) {
    return nextValue.replace(/[,.]/g, "");
  }

  const separatorIndex = Math.max(nextValue.indexOf(","), nextValue.indexOf("."));
  if (separatorIndex === -1) {
    return nextValue;
  }

  const integerPart = nextValue.slice(0, separatorIndex + 1);
  const decimalPart = nextValue.slice(separatorIndex + 1).replace(/[,.]/g, "");
  return `${integerPart}${decimalPart}`;
}

function parseValue(rawValue: string, decimals: boolean) {
  if (!rawValue || rawValue === "-" || rawValue === "," || rawValue === "." || rawValue === "-," || rawValue === "-.") {
    return null;
  }

  const normalized = decimals ? rawValue.replace(",", ".") : rawValue;
  const parsed = decimals ? Number(normalized) : Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, decimals = false, allowNegative = false, onBlur, onFocus, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [rawValue, setRawValue] = React.useState(() => toDisplayValue(value));

    React.useEffect(() => {
      if (!focused) {
        setRawValue(toDisplayValue(value));
      }
    }, [focused, value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={decimals ? "decimal" : "numeric"}
        value={rawValue}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          const parsed = parseValue(rawValue, decimals);
          if (parsed !== null) {
            setRawValue(toDisplayValue(parsed));
            onValueChange?.(parsed);
          }
          onBlur?.(event);
        }}
        onChange={(event) => {
          const nextValue = sanitizeValue(event.target.value, decimals, allowNegative);
          setRawValue(nextValue);

          const parsed = parseValue(nextValue, decimals);
          if (parsed !== null) {
            onValueChange?.(parsed);
          }
        }}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";
