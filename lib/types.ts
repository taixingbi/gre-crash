export type Section = "quant" | "verbal";

export type QuestionType = "single" | "multi" | "numeric" | "essay";

export type ChoiceItem = {
  letter: string;
  text: string;
};

export type QuestionTable = {
  caption?: string | null;
  headers?: string[];
  rows: string[][];
};

export type ErrorTag = "concept" | "careless" | "vocabulary" | "logic" | "time";

export type Tier = "free" | "pass_30" | "pass_90";

export type Question = {
  id: string;
  section: Section;
  category: string;
  number: number;
  questionType: QuestionType;
  choices: string[];
  choiceItems?: ChoiceItem[];
  prompt?: string;
  table?: QuestionTable | null;
  answer: string;
  hasImage: boolean;
  stem: string;
  parseStatus: string;
  aiGenerated?: boolean;
};

export type PublicQuestion = Omit<Question, "answer">;

export type User = {
  id: string;
  email: string;
};

export type Profile = {
  userId: string;
  testDate: string | null;
  currentQuant: number | null;
  currentVerbal: number | null;
  targetScore: number | null;
  hoursPerDay: number;
  weakAreas: string[];
  diagnosticDone: boolean;
  createdAt: string;
};

export type Attempt = {
  id: string;
  userId: string;
  questionId: string;
  section: Section;
  category: string;
  selected: string;
  correct: boolean;
  seconds: number;
  createdAt: string;
};

export type WrongQuestion = {
  userId: string;
  questionId: string;
  tag: ErrorTag;
  resolvedAt: string | null;
};

export type PlanItem =
  | {
      kind: "question";
      questionId: string;
      section: Section;
      category: string;
    }
  | {
      kind: "writing";
      day: number;
      title: string;
    };

export type StudyPlan = {
  userId: string;
  planDate: string;
  mode: "static" | "adaptive";
  label: string;
  minutes: number;
  items: PlanItem[];
};

export type WritingPrompt = {
  day: number;
  theme: string;
  prompt: string;
  task: string;
};

export type WritingDoc = {
  template: string;
  prompts: WritingPrompt[];
};

export type RubricScore = "Good" | "Needs work" | "Weak";

export type EssayRubric = {
  thesis: RubricScore;
  organization: RubricScore;
  evidence: RubricScore;
  counterargument: RubricScore;
  advice: string;
};

export type WritingSubmission = {
  id: string;
  userId: string;
  day: number;
  essay: string;
  rubric: EssayRubric;
  createdAt: string;
};

export type Subscription = {
  userId: string;
  plan: Exclude<Tier, "free">;
  accessUntil: string;
  stripeSessionId: string | null;
};
