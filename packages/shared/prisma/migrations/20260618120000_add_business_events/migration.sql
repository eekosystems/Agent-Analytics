-- CreateTable
CREATE TABLE "business_event_configs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_event_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trace_id" TEXT,
    "observation_id" TEXT,
    "client_id" TEXT,
    "value" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "business_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_event_configs_project_id_idx" ON "business_event_configs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_event_configs_project_id_name_key" ON "business_event_configs"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "business_event_configs_id_project_id_key" ON "business_event_configs"("id", "project_id");

-- CreateIndex
CREATE INDEX "business_events_project_id_config_id_timestamp_idx" ON "business_events"("project_id", "config_id", "timestamp");

-- CreateIndex
CREATE INDEX "business_events_project_id_trace_id_idx" ON "business_events"("project_id", "trace_id");

-- CreateIndex
CREATE INDEX "business_events_project_id_client_id_idx" ON "business_events"("project_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_events_id_project_id_key" ON "business_events"("id", "project_id");

-- AddForeignKey
ALTER TABLE "business_event_configs" ADD CONSTRAINT "business_event_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "business_event_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
