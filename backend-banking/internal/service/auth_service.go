package service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"banking/internal/domain"
	"banking/internal/repository/postgres"
)

var rbPhoneRegex = regexp.MustCompile(`^\+375(17|24|25|29|33|44)\d{7}$`)

type RegisterInput struct {
	Phone      string   `json:"phone"`
	Password   string   `json:"password"`
	FirstName  string   `json:"first_name"`
	LastName   string   `json:"last_name"`
	Email      *string  `json:"email"`
	Currencies []string `json:"currencies"`
}

type AuthService struct {
	db       *pgxpool.Pool
	userRepo *postgres.UserRepository
}

func NewAuthService(db *pgxpool.Pool, userRepo *postgres.UserRepository) *AuthService {
	return &AuthService{
		db:       db,
		userRepo: userRepo,
	}
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*domain.User, error) {
	phone := strings.ReplaceAll(input.Phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	if !rbPhoneRegex.MatchString(phone) {
		return nil, domain.ErrInvalidPhone
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now().UTC()
	user := &domain.User{
		ID:           uuid.New(),
		Phone:        phone,
		PasswordHash: string(hash),
		Email:        input.Email,
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		Role:         domain.RoleCustomer,
		Status:       domain.StatusActive,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("error to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.userRepo.CreateUserTx(ctx, tx, user); err != nil {
		return nil, err
	}

	accountID := uuid.New()
	accountNumber, err := domain.GenerateNumber()
	if err != nil {
		return nil, fmt.Errorf("failed to generate account number %w", err)
	}
	_, err = tx.Exec(ctx, `
    	INSERT INTO accounts (id, account_number ,user_id, type, status, created_at, updated_at)
     	VALUES ($1, $2, $3, 'user', 'active', $4, $5)
	`, accountID, accountNumber, user.ID, now, now)

	if err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	currencies := input.Currencies
	if len(currencies) == 0 {
		currencies = []string{"BYN"}
	}

	for _, cur := range currencies {
		cur = strings.ToUpper(strings.TrimSpace(cur))
		_, err = tx.Exec(ctx, `
        INSERT INTO account_balances (id, account_id, currency, balance, created_at, updated_at)
        VALUES ($1, $2, $3, 0, $4, $5)
    `, uuid.New(), accountID, cur, now, now)
		if err != nil {
			return nil, fmt.Errorf("failed to create balance for %s: %w", cur, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit tx: %w", err)
	}
	return user, nil
}

type LoginInput struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *domain.User `json:"user"`
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (*AuthResponse, error) {
	phone := strings.ReplaceAll(input.Phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")

	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, errors.New("invalid phone or password")
		}
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	if user.Status == domain.StatusBlocked {
		return nil, errors.New("account is blocked")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid phone or password")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default_fallback_secret_key"
	}

	claims := jwt.MapClaims{
		"sub":   user.ID.String(),
		"phone": user.Phone,
		"role":  string(user.Role),
		"exp":   time.Now().Add(15 * time.Minute).Unix(),
		"iat":   time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenstring, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %w", err)
	}

	return &AuthResponse{
		Token: tokenstring,
		User:  user,
	}, nil
}
