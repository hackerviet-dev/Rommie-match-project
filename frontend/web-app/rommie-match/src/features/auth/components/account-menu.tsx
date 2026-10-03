import {
  ChevronRight,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
  Shield,
  UsersRound,
  Scale,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { ACCOUNT_SECTIONS } from "@/constants/account-sections";
import { useSignOut } from "../hooks/use-sign-out";
import { useAuthStore } from "../store/auth-store";

export function AccountMenu() {
  const user = useAuthStore((state) => state.user);
  const initials = user?.name?.trim().slice(0, 2).toUpperCase() || "ME";
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mở menu tài khoản"
          className="rounded-full"
        >
          <Avatar className="h-9 w-9 ring-2 ring-mint">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-80 max-h-[calc(100dvh-2rem)] overflow-y-auto max-w-[calc(100vw-2rem)] rounded-2xl border-border/60 p-3 shadow-xl"
      >
        <div className="mb-3 rounded-xl border border-border/60 bg-background p-3 shadow-sm">
          <DropdownMenuLabel className="flex items-center gap-3 p-1">
            <Avatar className="h-11 w-11 ring-2 ring-mint">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate text-base font-semibold">
              {user?.name || "Tài khoản của bạn"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-0 my-3" />
          <DropdownMenuItem asChild>
            <Link
              to={`${ROUTES.settings}?section=profile`}
              className="justify-center rounded-lg bg-mint/25 py-3 font-medium text-navy"
            >
              <UserRound /> Xem hồ sơ của tôi
            </Link>
          </DropdownMenuItem>
        </div>
        <DropdownMenuItem asChild>
          <Link
            to={ROUTES.onboarding}
            className="gap-3 rounded-xl px-3 py-3 font-medium"
          >
            <ClipboardList className="text-teal" /> Hoàn thiện hồ sơ{" "}
            <ChevronRight className="ml-auto" />
          </Link>
        </DropdownMenuItem>
        {ACCOUNT_SECTIONS.filter((item) => item.id !== "profile").map(
          ({ id, label, icon: Icon }) => (
            <DropdownMenuItem asChild key={id}>
              <Link
                to={`${ROUTES.settings}?section=${id}`}
                className="gap-3 rounded-xl px-3 py-3 font-medium"
              >
                <Icon className="text-navy" />
                {label}
                <ChevronRight className="ml-auto" />
              </Link>
            </DropdownMenuItem>
          ),
        )}
        {(user?.role === "admin" || user?.role === "moderator") && (
          <DropdownMenuItem asChild>
            <Link
              to={ROUTES.admin}
              className="gap-3 rounded-xl px-3 py-3 font-medium"
            >
              <Shield className="text-navy" /> Quản trị{" "}
              <ChevronRight className="ml-auto" />
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/groups" className="gap-3 rounded-xl px-3 py-3 font-medium">
            <UsersRound className="text-navy" />
            Nhóm ở ghép của tôi
            <ChevronRight className="ml-auto" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/disputes"
            className="gap-3 rounded-xl px-3 py-3 font-medium"
          >
            <Scale className="text-navy" />
            Yêu cầu hòa giải
            <ChevronRight className="ml-auto" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to={ROUTES.communityGuidelines}
            className="gap-3 rounded-xl px-3 py-3 font-medium"
          >
            <ShieldCheck className="text-navy" /> Quy tắc cộng đồng{" "}
            <ChevronRight className="ml-auto" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-0 my-2" />
        <DropdownMenuItem
          disabled={signOut.isPending}
          onSelect={(event) => {
            event.preventDefault();
            signOut.mutate(false);
          }}
          className="gap-3 rounded-xl px-3 py-3 font-medium text-destructive focus:text-destructive"
        >
          <LogOut /> {signOut.isPending ? "Đang đăng xuất…" : "Đăng xuất"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
