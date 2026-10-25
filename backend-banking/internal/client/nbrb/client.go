package nbrb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/shopspring/decimal"
)

type NbrbRate struct {
	CurID           int             `json:"Cur_ID"`
	Date            string          `json:"Date"`
	CurAbbreviation string          `json:"Cur_Abbreviation"`
	CurScale        int             `json:"Cur_Scale"`
	CurName         string          `json:"Cur_Name"`
	CurOfficialRate decimal.Decimal `json:"Cur_OfficialRate"`
}

type Client struct {
	httpClient *http.Client
	baseURL    string
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    "https://api.nbrb.by/exrates/rates?periodicity=0",
	}
}

func (c *Client) FetchRates(ctx context.Context) (map[string]decimal.Decimal, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch rates from NBRB: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nbrb returned status: %d", resp.StatusCode)
	}

	var rates []NbrbRate
	if err := json.NewDecoder(resp.Body).Decode(&rates); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	result := make(map[string]decimal.Decimal)
	for _, r := range rates {
		if r.CurScale > 0 {
			result[r.CurAbbreviation] = r.CurOfficialRate.Div(decimal.NewFromInt(int64(r.CurScale)))
		}
	}

	return result, nil
}
