export type Quiz = {
  code: string;
  title: string;
  questions: { id: string; text: string; emoji: string; options: { id: string; text: string }[] }[];
};

export type QuizResult = {
  code: string;
  title: string;
  answers: Record<string, string>;
  traits: { noiseTolerance: number; tidiness: number; earlyBird: number; costSplit: string };
  tags: string[];
  completedAt: string;
  updatedAt: string;
};
