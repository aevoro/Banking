package validator

import (
	"errors"
	"regexp"
)

var (
	unpRegex = regexp.MustCompile(`^[0-9]{9}$`)
	weights  = [8]int{29, 23, 19, 17, 13, 7, 5, 3}

	ErrInvalidUNPFormat   = errors.New("invalid unp format")
	ErrInvalidUNPCheckSum = errors.New("invalid unp checksum")
)

func ValidateUnp(unp string) error {
	if !unpRegex.MatchString(unp) {
		return ErrInvalidUNPFormat
	}

	sum := 0
	for i := 0; i < 8; i++ {
		digit := int(unp[i] - '0')
		sum += digit * weights[i]
	}

	checkDigit := sum % 11
	if checkDigit == 10 {
		return ErrInvalidUNPCheckSum
	}

	exeptedDigit := int(unp[8] - '0')
	if checkDigit != exeptedDigit {
		return ErrInvalidUNPCheckSum
	}
	return nil
}
