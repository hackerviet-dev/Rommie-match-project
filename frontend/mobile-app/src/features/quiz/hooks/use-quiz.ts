import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { quizApi } from "../services/quiz-api";

export function useQuiz() {
  return useQuery({ queryKey: ["quiz", "questions"], queryFn: quizApi.get });
}

export function useMyQuiz() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["quiz", "me", userId],
    queryFn: quizApi.getMine,
    enabled: Boolean(userId),
    retry: false,
  });
}

export function useSaveQuiz() {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  return useMutation({
    mutationFn: quizApi.saveMine,
    onSuccess: (result) => {
      client.setQueryData(["quiz", "me", userId], result);
      void client.invalidateQueries({ queryKey: ["matching"] });
    },
  });
}
