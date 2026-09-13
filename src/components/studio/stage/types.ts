import type { ResourceRef } from "@/lib/client/api";

/* Live streaming state for a stage or Q&A run (exported contract, unchanged). */
export type RunState = {
  mode: "stage" | "qa";
  stageIndex: number;
  status: string;
  text: string;
  reasoning: string;
  resources: ResourceRef[];
};
