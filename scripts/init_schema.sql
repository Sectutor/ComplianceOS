CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core tables needed for login and basic functionality

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255),
  "name" VARCHAR(255),
  "role" VARCHAR(50) DEFAULT 'admin',
  "has_seen_tour" BOOLEAN DEFAULT false,
  "mfa_enabled" BOOLEAN DEFAULT false,
  "mfa_secret" TEXT,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "industry" VARCHAR(100),
  "size" VARCHAR(50),
  "status" VARCHAR(50) DEFAULT 'Active',
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_clients" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "role" VARCHAR(50) DEFAULT 'member',
  "created_at" TIMESTAMP DEFAULT now(),
  UNIQUE("user_id", "client_id")
);

CREATE TABLE IF NOT EXISTS "personal_access_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "name" VARCHAR(255),
  "expires_at" TIMESTAMP,
  "last_used_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMP NOT NULL,
  "used" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT now()
);