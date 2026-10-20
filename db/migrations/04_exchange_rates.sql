CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_different_currencies CHECK (from_currency != to_currency),
    CONSTRAINT chk_positive_rate CHECK (rate > 0),
    CONSTRAINT chk_from_currency_format CHECK (char_length(from_currency) = 3 AND from_currency = upper(from_currency)),
    CONSTRAINT chk_to_currency_format CHECK (char_length(to_currency) = 3 AND to_currency = upper(to_currency))
);

CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, created_at DESC);