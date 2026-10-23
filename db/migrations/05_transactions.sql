CREATE TYPE transaction_type AS ENUM (
    'transfer',
    'exchange',
    'deposit',
    'withdrawal'
);

CREATE TYPE transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'cancelled'
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    receiver_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    type transaction_type NOT NULL DEFAULT 'transfer',
    status transaction_status NOT NULL DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_positive_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_transaction_currency_format CHECK (char_length(currency) = 3 AND currency = upper(currency))
);

CREATE INDEX idx_transactions_sender ON transactions(sender_account_id, created_at DESC);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_account_id, created_at DESC);