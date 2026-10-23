CREATE TYPE org_verification_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    unp VARCHAR(9) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    legal_address TEXT NOT NULL,
    contact_name VARCHAR(255) NOT NULL,

    status org_verification_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_unp_format CHECK (unp ~ '^[0-9]{9}$')
);

CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_unp ON organizations(unp);
CREATE INDEX idx_organizations_status ON organizations(status);