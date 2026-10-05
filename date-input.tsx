import * as React from "react";
import { Input } from "@/components/ui/input";

export function DateInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="date" {...props} />;
}
