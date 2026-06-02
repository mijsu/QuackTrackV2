-- Add departmentId to GenerationSession for department-driven schedule generation
ALTER TABLE "GenerationSession" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "GenerationSession" ADD CONSTRAINT "GenerationSession_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL;
CREATE INDEX "GenerationSession_departmentId_idx" ON "GenerationSession"("departmentId");
