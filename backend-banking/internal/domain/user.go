package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUsersAlreadyExists = errors.New("users with this phone number already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidPhone       = errors.New("invalid format number, must be +375XXXXXXXXX")
)

type UserRole string

const (
	RoleCustomer UserRole = "customer"
	RoleAdmn     UserRole = "admin"
	RoleSupport  UserRole = "support"
)

type UserStatus string

const (
	StatusPending UserStatus = "pending"
	StatusActive  UserStatus = "active"
	StatusBlocked UserStatus = "blocked"
)

type User struct {
	ID           uuid.UUID  `json:"id"`
	Phone        string     `json:"phone"`
	PasswordHash string     `json:"-"`
	Email        *string    `json:"email,omitempty"`
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	Role         UserRole   `json:"role"`
	Status       UserStatus `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}
