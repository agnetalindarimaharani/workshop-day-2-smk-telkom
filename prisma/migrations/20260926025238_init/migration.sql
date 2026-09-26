-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'All Size',
    "rentalPrice" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "idCardNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RentalTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionCode" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "cashierName" TEXT NOT NULL DEFAULT 'Seli (Kasir)',
    "pickupDate" DATETIME NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "returnDate" DATETIME NOT NULL,
    "actualReturnDate" DATETIME,
    "totalBasePrice" INTEGER NOT NULL,
    "additionalCharge" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL,
    "remainingAmount" INTEGER NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'DP',
    "paymentMethod" TEXT NOT NULL DEFAULT 'TUNAI',
    "rentalStatus" TEXT NOT NULL DEFAULT 'BOOKING',
    "customerGuarantee" TEXT NOT NULL DEFAULT 'E-KTP',
    "fittingNotes" TEXT,
    "penaltyFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RentalTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RentalItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rentalTransactionId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "priceAtRent" INTEGER NOT NULL,
    "itemCustomNote" TEXT,
    CONSTRAINT "RentalItem_rentalTransactionId_fkey" FOREIGN KEY ("rentalTransactionId") REFERENCES "RentalTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RentalItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RentalTransaction_transactionCode_key" ON "RentalTransaction"("transactionCode");
