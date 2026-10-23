CREATE TYPE entry_direction AS ENUM (
    'debit',
    'credit'
);

CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL,
    amount NUMERIC(18, 4) NOT NULL,
    direction entry_direction NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_positive_entry_amount CHECK (amount > 0)
);

CREATE INDEX idx_entries_account ON entries(account_id, created_at DESC);
CREATE INDEX idx_entries_transaction ON entries(transaction_id);
