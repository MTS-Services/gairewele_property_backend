-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "maxListings" INTEGER,
    "maxImagesPerListing" INTEGER NOT NULL,
    "videoPerListing" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_plan_key" ON "PlanFeature"("plan");
