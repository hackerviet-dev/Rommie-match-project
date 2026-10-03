import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchingApi } from "../services/matching-api";
import { useAuthStore } from "@/features/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState, Pagination } from "@/components/common/query-state";
export function MatchRequests() {
  const [page, setPage] = useState(1),
    me = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    query = useQuery({
      queryKey: ["match-requests", me, page],
      queryFn: () => matchingApi.requests(page),
    }),
    action = useMutation({
      mutationFn: ({
        id,
        action,
      }: {
        id: string;
        action: "accept" | "decline" | "cancel" | "end";
      }) => matchingApi.respond(id, action),
      onSuccess: () =>
        client.invalidateQueries({ queryKey: ["match-requests"] }),
    });
  return (
    <Card className="rounded-3xl p-6">
      <h2 className="text-xl font-semibold">Đề nghị ở ghép</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Hai bên xác nhận để ghi nhận ghép thành công.
      </p>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-5 text-sm text-muted-foreground">Chưa có đề nghị.</p>
      )}
      {query.data?.items.map((r) => (
        <div key={r.id} className="mt-4 rounded-xl border p-4">
          <Link
            className="font-semibold text-teal"
            to={`/profile/${r.partner.userId}`}
          >
            {r.partner.displayName}
          </Link>
          <p className="mt-1 text-sm">
            {r.direction === "incoming" ? "Đã gửi cho bạn" : "Bạn đã gửi"} ·{" "}
            {r.status}
          </p>
          {r.message && <p className="mt-2 text-sm">{r.message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {r.status === "pending" &&
              !r.isBlocked &&
              (r.direction === "incoming" ? (
                <>
                  <Button
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: r.id, action: "accept" })
                    }
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ id: r.id, action: "decline" })
                    }
                  >
                    Từ chối
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: r.id, action: "cancel" })}
                >
                  Hủy đề nghị
                </Button>
              ))}
            {r.status === "accepted" && (
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() => action.mutate({ id: r.id, action: "end" })}
              >
                Kết thúc ở ghép
              </Button>
            )}
          </div>
        </div>
      ))}
      {action.isError && (
        <p role="alert" className="mt-3 text-destructive">
          {action.error.message}
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
