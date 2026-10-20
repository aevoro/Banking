CREATE TYPE account_type AS ENUM (
    'user',
    'system_fee',
    'system_settlement'
);

CREATE TYPE account_status AS ENUM (
    'active',
    'frozen',
    'closed'
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    type account_type NOT NULL DEFAULT 'user',
    status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_account UNIQUE (user_id),
    CONSTRAINT chk_user_account_owner CHECK (
        (type = 'user' AND user_id IS NOT NULL) OR (type != 'user')
    )
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);