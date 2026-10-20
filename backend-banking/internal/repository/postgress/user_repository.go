package postgress

import (
	"banking/internal/domain"
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUserTx(ctx context.Context, tx pgx.Tx, user *domain.User) error {
	query := `
		INSERT INTO users(id, phone, password_hash, email, first_name, last_name, role, status, created_at, updated_at)
		VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := tx.Exec(ctx, query,
		user.ID,
		user.Phone,
		user.PasswordHash,
		user.Email,
		user.FirstName,
		user.LastName,
		user.Role,
		user.Status,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrUsersAlreadyExists
		}
		return err
	}
	return nil
}

func (r *UserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	query := `
		SELECT id, phone, password_hash, email, first_name, last_name, role, status, created_at, updated_at
		FROM users
		WHERE phone = $1
	`
	var user domain.User
	err := r.db.QueryRow(ctx, query, phone).Scan(
		&user.ID,
		&user.Phone,
		&user.PasswordHash,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}
