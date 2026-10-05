import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FeaturePlaceholder({ title, version, description }: { title: string; version: string; description: string }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <CardContent className="py-10 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-muted"><Construction className="size-6 text-primary" /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Dự kiến {version}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
