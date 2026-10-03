import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { safetyApi } from "@/features/profile/services/safety-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState, Pagination } from "@/components/common/query-state";
export function BlockedUsers() {
  const [page, setPage] = useState(1),
    me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    query = useQuery({
      queryKey: ["blocks", me, page],
      queryFn: () => safetyApi.blocks(page),
    }),
    unblock = useMutation({
      mutationFn: safetyApi.unblock,
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ["blocks"] });
        void client.invalidateQueries({ queryKey: ["matching"] });
        void client.invalidateQueries({ queryKey: ["saved-profiles"] });
        void client.invalidateQueries({ queryKey: ["chat"] });
      },
    });
  return (
    <Card className="rounded-3xl p-6">
      <h2 className="text-xl font-semibold">Người đã chặn</h2>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Bạn chưa chặn ai.</p>
      )}
      {query.data?.items.map((u) => (
        <div
          key={u.userId}
          className="mt-4 flex items-center justify-between gap-3"
        >
          <span>{u.displayName}</span>
          <Button
            variant="outline"
            disabled={unblock.isPending}
            onClick={() => unblock.mutate(u.userId)}
          >
            Bỏ chặn
          </Button>
        </div>
      ))}
      {unblock.isError && (
        <p role="alert" className="mt-3 text-destructive">
          {unblock.error.message}
        </p>
      )}
      {query.data && query.data.totalCount > 0 && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
    </Card>
  );
}
