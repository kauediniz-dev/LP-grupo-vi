-- CreateTable
CREATE TABLE "PixValidation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bankName" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "minRequired" DECIMAL(10,2) NOT NULL,
    "rawMessage" TEXT,

    CONSTRAINT "PixValidation_pkey" PRIMARY KEY ("id")
);
