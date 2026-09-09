ALTER TABLE "tasks"
ADD COLUMN "task_type" VARCHAR(20) NOT NULL DEFAULT 'task',
ADD COLUMN "start_date" DATE,
ADD COLUMN "assignee_id" UUID;

CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_assignee_id_fkey"
FOREIGN KEY ("assignee_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
