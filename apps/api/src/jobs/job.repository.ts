import type { Job, JobStatus } from "./job.js";

export type CreateJobInput<TPayload> = {
  type: string;
  payload: TPayload;
  maxAttempts?: number;
  idempotencyKey?: string;
};

export type JobRepository = {
  create<TPayload>(input: CreateJobInput<TPayload>): Promise<Job<TPayload>>;
  list(): Promise<Job<unknown>[]>;
  findById(id: string): Promise<Job<unknown> | null>;
  addLog(id: string, message: string): Promise<Job<unknown> | null>;
  nextPending(): Promise<Job<unknown> | null>;
  updateStatus(id: string, status: JobStatus): Promise<Job<unknown> | null>;
  incrementAttempts(id: string): Promise<Job<unknown> | null>;
};
