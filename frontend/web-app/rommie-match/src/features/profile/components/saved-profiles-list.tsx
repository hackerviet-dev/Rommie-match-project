import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth";
import {
  savedProfilesApi,
  useSavedProfiles,
} from "../hooks/use-saved-profiles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState, Pagination } from "@/components/common/query-state";
export function SavedProfilesList() {
  const [page, setPage] = useState(1),
    userId = useAuthStore((s) => s.user?.id),
    saved = useSavedProfiles();
  const query = useQuery({
    queryKey: ["saved-profiles", "list", userId, page],
    queryFn: () => savedProfilesApi.list(page),
  });
  return (
    <>
      <QueryState query={query} />
      {query.data?.totalCount === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          Chưa có hồ sơ đã lưu.{" "}
          <Link className="text-teal underline" to="/matches">
            Khám phá ở ghép
          </Link>
        </p>
      )}
      <div className="space-y-3">
        {query.data?.items.map((p) => (
          <Card
            key={p.userId}
            className="flex flex-wrap items-center gap-4 rounded-2xl p-5"
          >
            <div className="flex-1">
              <h2 className="font-semibold">{p.displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {p.occupation} · {p.city}
              </p>
            </div>
            <Button asChild>
              <Link to={`/profile/${p.userId}`}>Xem hồ sơ</Link>
            </Button>
            <Button
              variant="outline"
              disabled={saved.mutation.isPending}
              onClick={() =>
                saved.mutation.mutate(
                  { id: p.userId, saved: false },
                  { onError: (e) => toast.error(e.message) },
                )
              }
            >
              Bỏ lưu
            </Button>
          </Card>
        ))}
      </div>
      {query.data && (
        <Pagination
          page={page}
          hasNext={query.data.hasNextPage}
          onChange={setPage}
        />
      )}
    </>
  );
}
