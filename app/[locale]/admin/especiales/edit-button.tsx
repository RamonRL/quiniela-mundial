"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpecialForm } from "./special-form";

type Special = {
  id: number;
  key: string;
  question: string;
  type: "yes_no" | "single_choice" | "team_with_round" | "number_range" | "player";
  optionsJson: unknown;
  pointsConfigJson: unknown;
  closesAt: string;
};

export function EditSpecialButton({ special }: { special: Special }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Editar
      </Button>
      <SpecialForm open={open} onOpenChange={setOpen} special={special} />
    </>
  );
}
