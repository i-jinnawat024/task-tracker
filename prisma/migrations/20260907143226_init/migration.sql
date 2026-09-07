-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'doing', 'done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'editor');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_members" (
    "list_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'editor',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_members_pkey" PRIMARY KEY ("list_id","user_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "list_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "notes" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "due_date" DATE,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "lists_owner_id_idx" ON "lists"("owner_id");

-- CreateIndex
CREATE INDEX "list_members_user_id_idx" ON "list_members"("user_id");

-- CreateIndex
CREATE INDEX "tasks_list_id_status_idx" ON "tasks"("list_id", "status");

-- CreateIndex
CREATE INDEX "tasks_list_id_due_date_idx" ON "tasks"("list_id", "due_date");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
