package domain

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

func GenerateNumber() (string, error) {
	var digits string
	for i := 0; i < 20; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		digits += fmt.Sprintf("%d", n)
	}
	return fmt.Sprintf("BY20BNKG%s", digits), nil
}
