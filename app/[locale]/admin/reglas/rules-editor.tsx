"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveRules, type FormState } from "./actions";

const initial: FormState = { ok: false };

type Rule = { key: string; points: number; description: string };

const SECTIONS: { title: string; prefix: string[] }[] = [
  { title: "Posiciones de grupo", prefix: ["group_position_", "group_top2_"] },
  { title: "Bracket eliminatorio", prefix: ["bracket_"] },
  { title: "Bota de Oro", prefix: ["top_scorer_"] },
  { title: "Partido · fase de grupos", prefix: ["match_g_"] },
  { title: "Partido · fase final", prefix: ["match_ko_"] },
  { title: "Goleador del partido", prefix: ["match_scorer", "match_first_scorer"] },
  { title: "Solo Ganador", prefix: ["solo_"] },
];

export function RulesEditor({ rules: initialRules }: { rules: Rule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [state, action, pending] = useActionState(saveRules, initial);

  const sectioned = SECTIONS.map((s) => ({
    ...s,
    items: rules.filter((r) => s.prefix.some((p) => r.key.startsWith(p))),
  })).filter((s) => s.items.length > 0);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="rulesJson" value={JSON.stringify(rules)} />
      <div className="grid gap-4 lg:grid-cols-2">
        {sectioned.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.items.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.description}</p>
                    <p className="font-mono text-xs text-[var(--color-muted-foreground)]">
                      {r.key}
                    </p>
                  </div>
                  <Input
                    type="number"
                    className="w-20 text-right"
                    value={r.points}
                    onChange={(e) =>
                      setRules((prev) =>
                        prev.map((x) =>
                          x.key === r.key ? { ...x, points: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-[var(--color-success)]">
          Reglas guardadas y puntos recalculados.
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          <Save />
          {pending ? "Guardando y recalculando…" : "Guardar y recalcular"}
        </Button>
      </div>
    </form>
  );
}
