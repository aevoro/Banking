CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('customer', 'admin', 'support');

CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked');

CREATE TYPE customer_type AS ENUM ('individual', 'company');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(13) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    status user_status NOT NULL DEFAULT 'active',
    customer_type customer_type NOT NULL DEFAULT 'individual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_phone_rb CHECK (phone ~ '^\+375[0-9]{9}$'),
    CONSTRAINT chk_email_lowercase CHECK (email IS NULL OR email = lower(email))
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_customer_type ON users(customer_type);
