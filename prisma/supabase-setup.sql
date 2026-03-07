-- ============================================================
-- AR-Core-7 Database Setup for Supabase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- STEP 1: Create Enums
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'CONTENT_MANAGER', 'VIEWER');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExperienceType" AS ENUM ('PRODUCT_VIEWER', 'SURFACE_AR', 'IMAGE_TARGET', 'QR_LAUNCH', 'EMBED_VIEWER');
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "ApiKeyEnvironment" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "AssetType" AS ENUM ('IMAGE_2D', 'MODEL_GLB', 'MODEL_GLTF', 'MODEL_USDZ', 'POSTER', 'TARGET_IMAGE', 'FACE_EFFECT', 'THUMBNAIL');

-- STEP 2: Create Tables
CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "brandPrimary" TEXT NOT NULL DEFAULT '#4263eb',
    "brandSecondary" TEXT NOT NULL DEFAULT '#748ffc',
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultArSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "hashedSecret" TEXT NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "environment" "ApiKeyEnvironment" NOT NULL DEFAULT 'LIVE',
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "description" TEXT,
    "brand" TEXT,
    "thumbnailUrl" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[],
    "dimensionWidth" DOUBLE PRECISION,
    "dimensionHeight" DOUBLE PRECISION,
    "dimensionDepth" DOUBLE PRECISION,
    "dimensionUnit" TEXT DEFAULT 'cm',
    "scalePreset" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "anchorType" TEXT NOT NULL DEFAULT 'floor',
    "defaultSceneConfig" JSONB,
    "assetCompletenessScore" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "externalSource" TEXT,
    "externalHandle" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAsset" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "metadata" JSONB,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Experience" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "experienceType" "ExperienceType" NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "initialRotationX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialRotationY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialRotationZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionOffsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionOffsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionOffsetZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lightingPreset" TEXT NOT NULL DEFAULT 'studio',
    "backgroundMode" TEXT NOT NULL DEFAULT 'transparent',
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "analyticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "sceneConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublishRecord" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "experienceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "publishStatus" "PublishStatus" NOT NULL,
    "publicUrl" TEXT,
    "embedSnippet" TEXT,
    "qrCodeUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublishRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "experienceId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "duration" INTEGER,
    "deviceType" TEXT,
    "browser" TEXT,
    "country" TEXT,
    "launchSource" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT,
    "companyId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "experienceId" TEXT,
    "targetUrl" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'png',
    "size" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelOptimizationJob" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "assetId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputPath" TEXT NOT NULL,
    "outputPath" TEXT,
    "optimizations" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelOptimizationJob_pkey" PRIMARY KEY ("id")
);

-- STEP 3: Create Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "ApiKey_companyId_idx" ON "ApiKey"("companyId");
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
CREATE INDEX "ApiKey_status_idx" ON "ApiKey"("status");
CREATE INDEX "Membership_companyId_idx" ON "Membership"("companyId");
CREATE UNIQUE INDEX "Membership_userId_companyId_key" ON "Membership"("userId", "companyId");
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "Product_externalId_idx" ON "Product"("externalId");
CREATE INDEX "ProductAsset_productId_idx" ON "ProductAsset"("productId");
CREATE INDEX "ProductAsset_assetType_idx" ON "ProductAsset"("assetType");
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");
CREATE INDEX "Experience_companyId_idx" ON "Experience"("companyId");
CREATE INDEX "Experience_publishStatus_idx" ON "Experience"("publishStatus");
CREATE INDEX "PublishRecord_experienceId_idx" ON "PublishRecord"("experienceId");
CREATE INDEX "AnalyticsEvent_companyId_idx" ON "AnalyticsEvent"("companyId");
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX "AnalyticsEvent_deviceType_idx" ON "AnalyticsEvent"("deviceType");
CREATE INDEX "AnalyticsEvent_launchSource_idx" ON "AnalyticsEvent"("launchSource");
CREATE UNIQUE INDEX "Setting_companyId_key_key" ON "Setting"("companyId", "key");
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "Webhook_companyId_idx" ON "Webhook"("companyId");
CREATE INDEX "Webhook_isActive_idx" ON "Webhook"("isActive");
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX "WebhookDelivery_nextRetryAt_idx" ON "WebhookDelivery"("nextRetryAt");
CREATE INDEX "QRCode_experienceId_idx" ON "QRCode"("experienceId");
CREATE UNIQUE INDEX "QRCode_targetUrl_key" ON "QRCode"("targetUrl");
CREATE INDEX "ModelOptimizationJob_status_idx" ON "ModelOptimizationJob"("status");
CREATE INDEX "ModelOptimizationJob_assetId_idx" ON "ModelOptimizationJob"("assetId");

-- STEP 4: Add Foreign Keys
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublishRecord" ADD CONSTRAINT "PublishRecord_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishRecord" ADD CONSTRAINT "PublishRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- STEP 5: Seed Data
-- ============================================================

-- Users (password: admin123 / viewer123)
INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName") VALUES
  ('usr_admin', 'admin@arcore7.com', '$2a$10$YWZMbgM.zSDHinvUtNOx4ubjxv5x8H.dqJEfwL5HTcg.OEhhbA3CS', 'Alex', 'Admin'),
  ('usr_sarah', 'sarah@luxebrands.com', '$2a$10$YWZMbgM.zSDHinvUtNOx4ubjxv5x8H.dqJEfwL5HTcg.OEhhbA3CS', 'Sarah', 'Chen'),
  ('usr_mike', 'mike@luxebrands.com', '$2a$10$YWZMbgM.zSDHinvUtNOx4ubjxv5x8H.dqJEfwL5HTcg.OEhhbA3CS', 'Mike', 'Rivera'),
  ('usr_viewer', 'viewer@arcore7.com', '$2a$10$YFgmadHCtexz0qkrA0/hJeWkCt9FFBvfPhS.Xh7bTj4Z8bpUMMd/e', 'Demo', 'Viewer');

-- Companies
INSERT INTO "Company" ("id", "name", "slug", "brandPrimary", "brandSecondary", "domain") VALUES
  ('cmp_luxe', 'Luxe Brands', 'luxe-brands', '#1a1a2e', '#e94560', 'luxebrands.com'),
  ('cmp_tech', 'TechGear Pro', 'techgear-pro', '#0ea5e9', '#38bdf8', 'techgearpro.com'),
  ('cmp_noor', 'Noor Home Decor', 'noor-home', '#d97706', '#f59e0b', 'noorhome.com'),
  ('cmp_pizza', 'Pizza Demo Restaurant', 'pizza-demo', '#dc2626', '#f97316', 'pizzademo.arcore7.com');

-- Memberships
INSERT INTO "Membership" ("id", "userId", "companyId", "role") VALUES
  (gen_random_uuid()::text, 'usr_admin', 'cmp_luxe', 'SUPER_ADMIN'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_tech', 'SUPER_ADMIN'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_noor', 'SUPER_ADMIN'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_pizza', 'SUPER_ADMIN'),
  (gen_random_uuid()::text, 'usr_sarah', 'cmp_luxe', 'COMPANY_ADMIN'),
  (gen_random_uuid()::text, 'usr_mike', 'cmp_luxe', 'CONTENT_MANAGER'),
  (gen_random_uuid()::text, 'usr_viewer', 'cmp_luxe', 'VIEWER'),
  (gen_random_uuid()::text, 'usr_viewer', 'cmp_tech', 'VIEWER');

-- Products
INSERT INTO "Product" ("id", "companyId", "title", "sku", "category", "description", "brand", "status", "tags", "scalePreset", "anchorType", "assetCompletenessScore") VALUES
  ('prd_sneaker', 'cmp_luxe', 'Premium Running Sneaker', 'LX-SNK-001', 'Footwear', 'High-performance running sneaker with breathable mesh upper and responsive foam midsole.', 'Luxe Athletics', 'ACTIVE', ARRAY['sneaker','running','premium','athletic'], 1.0, 'floor', 100),
  ('prd_watch', 'cmp_luxe', 'Chronograph Watch Elite', 'LX-WCH-002', 'Accessories', 'Elegant chronograph watch with sapphire crystal glass and Swiss movement.', 'Luxe Timepieces', 'ACTIVE', ARRAY['watch','luxury','chronograph','swiss'], 0.3, 'table', 45),
  ('prd_handbag', 'cmp_luxe', 'Designer Leather Handbag', 'LX-BAG-003', 'Bags', 'Artisan-crafted leather handbag with gold hardware.', 'Luxe Maison', 'DRAFT', ARRAY['handbag','leather','luxury','designer'], 0.8, 'table', 15),
  ('prd_headphones', 'cmp_tech', 'Wireless ANC Headphones', 'TG-HP-001', 'Audio', 'Premium wireless headphones with active noise cancellation and 40-hour battery life.', 'TechGear Audio', 'ACTIVE', ARRAY['headphones','wireless','ANC','audio'], 0.5, 'table', 30),
  ('prd_speaker', 'cmp_tech', 'Portable Bluetooth Speaker', 'TG-SPK-002', 'Audio', 'Rugged portable speaker with 360-degree sound and waterproof design.', 'TechGear Audio', 'ACTIVE', ARRAY['speaker','bluetooth','portable','waterproof'], 0.6, 'table', 20),
  ('prd_lamp', 'cmp_noor', 'Arabesque Table Lamp', 'NH-LMP-001', 'Lighting', 'Handcrafted brass table lamp with intricate arabesque patterns.', 'Noor Artisan', 'ACTIVE', ARRAY['lamp','brass','arabesque','handcrafted'], 0.7, 'table', 20),
  ('prd_vase', 'cmp_noor', 'Ceramic Art Vase', 'NH-VSE-002', 'Decor', 'Contemporary ceramic vase with geometric patterns.', 'Noor Studio', 'ACTIVE', ARRAY['vase','ceramic','geometric','modern'], 0.5, 'table', 15),
  ('prd_margherita', 'cmp_pizza', 'Margherita Pizza', 'PZ-MRG-001', 'Pizza', 'Classic Italian margherita with fresh mozzarella, San Marzano tomatoes, and basil.', 'Pizza Demo', 'ACTIVE', ARRAY['pizza','margherita','classic','italian'], 0.3, 'table', 100),
  ('prd_pepperoni', 'cmp_pizza', 'Pepperoni Pizza', 'PZ-PEP-001', 'Pizza', 'Loaded pepperoni pizza with extra cheese and spicy pepperoni.', 'Pizza Demo', 'ACTIVE', ARRAY['pizza','pepperoni','spicy','classic'], 0.3, 'table', 100);

-- Experiences
INSERT INTO "Experience" ("id", "companyId", "productId", "name", "slug", "experienceType", "publishStatus", "lightingPreset", "backgroundMode", "ctaText", "ctaLink", "scale", "analyticsEnabled") VALUES
  ('exp_sneaker_3d', 'cmp_luxe', 'prd_sneaker', 'Sneaker 3D Showcase', 'lx-sneaker-3d', 'PRODUCT_VIEWER', 'PUBLISHED', 'studio', 'gradient', 'Shop Now', 'https://luxebrands.com/sneaker', 1.0, true),
  ('exp_sneaker_ar', 'cmp_luxe', 'prd_sneaker', 'Sneaker AR Try-On', 'lx-sneaker-ar', 'SURFACE_AR', 'PUBLISHED', 'outdoor', 'transparent', 'Add to Cart', 'https://luxebrands.com/sneaker/buy', 1.0, true),
  ('exp_watch', 'cmp_luxe', 'prd_watch', 'Watch Elite Viewer', 'lx-watch-elite', 'PRODUCT_VIEWER', 'PUBLISHED', 'warm', 'dark', NULL, NULL, 1.0, true),
  ('exp_watch_ar', 'cmp_luxe', 'prd_watch', 'Watch Catalog AR', 'lx-watch-catalog-ar', 'IMAGE_TARGET', 'DRAFT', 'studio', 'transparent', NULL, NULL, 1.0, true),
  ('exp_hp_qr', 'cmp_tech', 'prd_headphones', 'Headphones QR Experience', 'tg-headphones-qr', 'QR_LAUNCH', 'PUBLISHED', 'cool', 'transparent', 'Buy on TechGear', 'https://techgearpro.com/headphones', 1.0, true),
  ('exp_lamp', 'cmp_noor', 'prd_lamp', 'Arabesque Lamp Showcase', 'noor-lamp-showcase', 'SURFACE_AR', 'READY', 'warm', 'transparent', NULL, NULL, 1.0, true),
  ('exp_margherita', 'cmp_pizza', 'prd_margherita', 'Margherita Pizza AR', 'margherita', 'SURFACE_AR', 'PUBLISHED', 'warm', 'transparent', 'Order Now', '#', 0.3, true),
  ('exp_pepperoni', 'cmp_pizza', 'prd_pepperoni', 'Pepperoni Pizza AR', 'pepperoni', 'SURFACE_AR', 'PUBLISHED', 'warm', 'transparent', 'Order Now', '#', 0.3, true);

-- Publish Records
INSERT INTO "PublishRecord" ("id", "experienceId", "companyId", "publishStatus", "publicUrl", "publishedAt", "publishedBy") VALUES
  (gen_random_uuid()::text, 'exp_sneaker_3d', 'cmp_luxe', 'PUBLISHED', '/ar/lx-sneaker-3d', NOW(), 'usr_admin'),
  (gen_random_uuid()::text, 'exp_sneaker_ar', 'cmp_luxe', 'PUBLISHED', '/ar/lx-sneaker-ar', NOW(), 'usr_admin'),
  (gen_random_uuid()::text, 'exp_watch', 'cmp_luxe', 'PUBLISHED', '/ar/lx-watch-elite', NOW(), 'usr_admin'),
  (gen_random_uuid()::text, 'exp_hp_qr', 'cmp_tech', 'PUBLISHED', '/ar/tg-headphones-qr', NOW(), 'usr_admin'),
  (gen_random_uuid()::text, 'exp_margherita', 'cmp_pizza', 'PUBLISHED', '/launch/margherita', NOW(), 'usr_admin'),
  (gen_random_uuid()::text, 'exp_pepperoni', 'cmp_pizza', 'PUBLISHED', '/launch/pepperoni', NOW(), 'usr_admin');

-- Audit Logs
INSERT INTO "AuditLog" ("id", "userId", "companyId", "action", "entity", "entityId") VALUES
  (gen_random_uuid()::text, 'usr_admin', 'cmp_luxe', 'CREATE', 'Company', 'cmp_luxe'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_tech', 'CREATE', 'Company', 'cmp_tech'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_noor', 'CREATE', 'Company', 'cmp_noor'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_luxe', 'CREATE', 'Product', 'prd_sneaker'),
  (gen_random_uuid()::text, 'usr_admin', 'cmp_luxe', 'CREATE', 'Experience', 'exp_sneaker_3d'),
  (gen_random_uuid()::text, 'usr_admin', NULL, 'LOGIN', 'User', 'usr_admin');

-- Prisma migrations tracking table (so Prisma knows the schema is in sync)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

-- Done!
-- Login: admin@arcore7.com / admin123
