import { useState } from "react";
import { ScreenShell } from "@/components/screen-shell";
import { MatchScreen } from "@/features/matching/match-screen";
import { roommates } from "@/mocks/mock-data";

export default function MatchesRoute() {
  const [roommateIndex, setRoommateIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const activeRoommate = roommates[roommateIndex];

  function nextRoommate() {
    setRoommateIndex((current) => (current + 1) % roommates.length);
  }

  function likeRoommate() {
    setLiked((current) =>
      current.includes(activeRoommate.name) ? current : [...current, activeRoommate.name],
    );
    nextRoommate();
  }

  return (
    <ScreenShell title="Ghép đôi">
      <MatchScreen
        likedCount={liked.length}
        onLike={likeRoommate}
        onSkip={nextRoommate}
        roommate={activeRoommate}
      />
    </ScreenShell>
  );
}
