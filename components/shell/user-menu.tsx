"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, Settings, ShieldCheck, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

type UserMenuProps = {
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export function UserMenu({ email, nickname, avatarUrl, isAdmin }: UserMenuProps) {
  const t = useTranslations("shell");
  const display = nickname || email.split("@")[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
        <Avatar className="size-9 ring-2 ring-transparent transition group-hover:ring-[var(--color-primary)]/30">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={display} /> : null}
          <AvatarFallback>{initials(display)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium md:block">{display}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5 normal-case">
            <span className="text-sm font-medium tracking-normal text-[var(--color-foreground)]">
              {display}
            </span>
            <span className="text-xs font-normal tracking-normal text-[var(--color-muted-foreground)]">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserCog className="size-4" />
            <span>{t("myProfile")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ajustes">
            <Settings className="size-4" />
            <span>{t("settings")}</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck className="size-4" />
              <span>{t("admin")}</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/logout" method="post" className="contents">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-[var(--color-danger)]"
            >
              <LogOut className="size-4" />
              <span>{t("logout")}</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
