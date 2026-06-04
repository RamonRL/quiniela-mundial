"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Edit2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shell/empty-state";
import { LeagueTabs } from "@/components/shell/league-tabs";
import { EmojiPicker } from "@/components/leagues/emoji-picker";
import type { DepartmentRankingEntry } from "@/lib/leaderboard";
import { DeptCards } from "./dept-cards";
import { MembersTable } from "./members-table";
import { buildDeptCards, type DeptBasic, type MemberRowData } from "./dept-data";
import { createDepartment, deleteDepartment, updateDepartment } from "./actions";

type Department = DeptBasic;

export function DepartmentsManager({
  leagueId,
  departments,
  rankings,
  members,
}: {
  leagueId: number;
  departments: Department[];
  rankings: DepartmentRankingEntry[];
  members: MemberRowData[];
}) {
  const t = useTranslations("departments");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);

  const cards = useMemo(
    () => buildDeptCards(departments, rankings, members),
    [departments, rankings, members],
  );

  const groupsTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              {t("createDept")}
            </Button>
          </DialogTrigger>
          <CreateDepartmentDialog leagueId={leagueId} onClose={() => setCreateOpen(false)} />
        </Dialog>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <DeptCards
          cards={cards}
          actions={(card) => (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 bg-black/10 backdrop-blur-sm hover:bg-black/20"
                onClick={() =>
                  setEditDept({
                    id: card.id,
                    name: card.name,
                    emoji: card.emoji,
                    color: card.color,
                  })
                }
                aria-label={t("editAria")}
              >
                <Edit2 className="size-3.5" />
              </Button>
              <DeleteDeptButton deptId={card.id} name={card.name} />
            </>
          )}
        />
      )}
    </div>
  );

  const membersTab = (
    <MembersTable leagueId={leagueId} members={members} departments={departments} />
  );

  return (
    <>
      <LeagueTabs
        tabs={[
          { id: "groups", label: t("tabGroups"), content: groupsTab },
          { id: "members", label: t("tabMembers"), content: membersTab },
        ]}
      />

      {editDept ? (
        <EditDepartmentDialog dept={editDept} onClose={() => setEditDept(null)} />
      ) : null}
    </>
  );
}

function CreateDepartmentDialog({
  leagueId,
  onClose,
}: {
  leagueId: number;
  onClose: () => void;
}) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("createTitle")}</DialogTitle>
      </DialogHeader>
      <form
        action={(fd: FormData) => {
          setError(null);
          fd.append("leagueId", String(leagueId));
          fd.set("emoji", emoji ?? "");
          startTransition(async () => {
            const res = await createDepartment({ ok: false }, fd);
            if (!res.ok) {
              setError(res.error ?? t("errorCreate"));
              return;
            }
            router.refresh();
            setEmoji(null);
            onClose();
          });
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">{t("nameLabel")}</Label>
          <Input id="dept-name" name="name" placeholder={t("namePlaceholder")} required maxLength={40} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("emojiOptional")}</Label>
            <EmojiPicker
              value={emoji}
              onChange={setEmoji}
              pickLabel={t("emojiPick")}
              clearLabel={t("emojiNone")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-color">{t("colorOptional")}</Label>
            <Input id="dept-color" name="color" type="color" defaultValue="#ef5043" />
          </div>
        </div>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditDepartmentDialog({
  dept,
  onClose,
}: {
  dept: Department;
  onClose: () => void;
}) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(dept.emoji);
  const initialColor = dept.color ?? "#ef5043";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd: FormData) => {
            setError(null);
            fd.append("deptId", String(dept.id));
            fd.set("emoji", emoji ?? "");
            startTransition(async () => {
              const res = await updateDepartment({ ok: false }, fd);
              if (!res.ok) {
                setError(res.error ?? t("errorGeneric"));
                return;
              }
              router.refresh();
              onClose();
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">{t("nameLabel")}</Label>
            <Input
              id="dept-name"
              name="name"
              defaultValue={dept.name}
              required
              maxLength={40}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("emojiLabel")}</Label>
              <EmojiPicker
                value={emoji}
                onChange={setEmoji}
                pickLabel={t("emojiPick")}
                clearLabel={t("emojiNone")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-color">{t("colorLabel")}</Label>
              <Input id="dept-color" name="color" type="color" defaultValue={initialColor} />
            </div>
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDeptButton({ deptId, name }: { deptId: number; name: string }) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const onClick = () => {
    if (!confirm(t("deleteConfirm", { name }))) return;
    const fd = new FormData();
    fd.append("deptId", String(deptId));
    startTransition(async () => {
      await deleteDepartment(fd);
      router.refresh();
    });
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 bg-black/10 text-[var(--color-danger)] backdrop-blur-sm hover:bg-[var(--color-danger)]/15"
      disabled={pending}
      onClick={onClick}
      aria-label={t("deleteAria")}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
