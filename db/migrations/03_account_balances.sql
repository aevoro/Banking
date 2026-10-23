CREATE TABLE account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL,
    balance NUMERIC(18,4) NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_account_currency UNIQUE (account_id, currency),
    CONSTRAINT chk_positive_balance CHECK (balance >= 0),
    CONSTRAINT chk_currency_format CHECK (
        char_length(currency) = 3 AND currency = upper(currency)
    )
);

CREATE INDEX idx_account_balances_account_id ON account_balances(account_id);
CREATE INDEX idx_account_balances_currency ON account_balances(currency);

