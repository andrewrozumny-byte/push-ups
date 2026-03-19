"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckinButton } from "./CheckinButton";
import type { UserWithStats } from "@/lib/db";

type UserCardProps = {
  user: UserWithStats;
  checkedInToday: boolean;
};

export function UserCard({ user, checkedInToday }: UserCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          <Link
            href={`/${user.id}`}
            className="hover:underline focus:outline-none focus:underline"
          >
            <span className="mr-1.5">{user.emoji}</span>
            {user.name}
          </Link>
        </CardTitle>
        <Badge variant="secondary" className="shrink-0">
          {user.total_checkins} дней
        </Badge>
      </CardHeader>
      <CardContent>
        {user.last_checkin && (
          <p className="text-sm text-muted-foreground">
            Последний раз: {user.last_checkin}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex items-center gap-2">
        <CheckinButton
          userId={user.id}
          checkedIn={checkedInToday}
          userName={user.name}
        />
        <Link href={`/${user.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Профиль
        </Link>
      </CardFooter>
    </Card>
  );
}
