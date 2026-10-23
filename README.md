# Banking Ledger API 💳🏛️

[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?style=flat&logo=go)](https://golang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)

Высоконадежный бэкенд банковского сервиса (Core Banking / Ledger) на **Go**, спроектированный по принципам **Clean Architecture** с использованием бухгалтерской модели двойной записи (**Double-Entry Bookkeeping**), защитой от состояний гонки (**Race Conditions**) и взаимоблокировок (**Deadlocks**), мультивалютными счетами, регистрацией организаций (B2B) и автоматической синхронизацией курсов валют с НБРБ.

---

## ⚡ Особенности

- **Бухгалтерская книга двойной записи (Double-Entry Ledger)**: Каждая операция создает проводки `debit` и `credit` в таблице `entries` с сохранением мастер-транзакции в `transactions`.
- **Защита от Race Conditions и Deadlocks**: Блокировка балансов `SELECT ... FOR UPDATE` со строгой сортировкой `ORDER BY id ASC` для исключения дедлоков при встречных транзакциях.
- **Мультивалютность и кросс-курсы**: Поддержка счетов в `BYN`, `USD`, `EUR`, `RUB`. Расчет прямых, обратных и транзитных курсов через базовую валюту `BYN`.
- **Интеграция с Нацбанком РБ (НБРБ)**: Фоновый воркер периодически опрашивает открытый API НБРБ с учетом коэффициента масштаба (`Cur_Scale`) и обновляет курсы в базе.
- **Юридические лица (B2B)**: Регистрация организаций с проверкой контрольной суммы белорусского УНП (алгоритм по модулю 11).
- **Безопасность**: Хеширование паролей `bcrypt`, аутентификация по `JWT` (HMAC-SHA256), валидация номеров телефонов РБ (`+375...`), защита от овердрафта на уровне СУБД (`CHECK (balance >= 0)`).

---

## 🛠 Стек технологий

| Компонент | Технологии |
| :--- | :--- |
| **Язык** | Go 1.22+ / 1.27 |
| **СУБД** | PostgreSQL 16 (драйвер `jackc/pgx/v5` + `pgxpool`) |
| **Безопасность** | `golang-jwt/jwt`, `golang.org/x/crypto/bcrypt` |
| **Инфраструктура** | Docker, Docker Compose, Redis 7, Apache Kafka (KRaft) |

---

## 📂 Структура проекта

```text
├── backend-banking/
│   ├── cmd/api/main.go               # Точка входа: инициализация пула БД, зависимостей и запуск сервера
│   ├── internal/
│   │   ├── client/nbrb/              # HTTP-клиент к открытому API НБРБ
│   │   ├── domain/                   # Доменные модели (User, Account, Transfer) и генератор счетов IBAN
│   │   ├── repository/postgres/      # Репозитории (users, accounts, balances, transfers, rates, organizations)
│   │   ├── service/                  # Бизнес-логика (Auth, Transfer, Exchange, Organization)
│   │   ├── transport/http/           # HTTP-хендлеры, роутер (routes.go) и JWT middleware
│   │   ├── validator/                # Валидаторы (проверка УНП с контрольной суммой)
│   │   └── worker/                   # Фоновый воркер синхронизации курсов валют
│   ├── Dockerfile                    # Multi-stage сборка минимального контейнера на базе scratch
│   └── docker-compose.yml            # Сервисы: App, PostgreSQL 16, Redis 7, Apache Kafka
└── db/migrations/                    # SQL-миграции схемы базы данных (01-08)
```

---

## 📡 REST API Спецификация

### Общие эндпоинты

| Метод | Путь | Доступ | Описание |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Публичный | Проверка жизнеспособности сервиса и подключения к БД |
| `POST` | `/api/v1/auth/register` | Публичный | Регистрация пользователя с созданием счета и валютных кошельков |
| `POST` | `/api/v1/auth/login` | Публичный | Аутентификация пользователя и выдача JWT токена |
| `GET` | `/api/v1/exchange/convert` | Публичный | Калькулятор конвертации валют (прямой, обратный и кросс-курс) |
| `POST` | `/api/v1/transfers` | JWT | Внутренний перевод средств (по номеру телефона или номеру счета) |
| `POST` | `/api/v1/exchange` | JWT | Конвертация средств между своими валютными счетами |
| `POST` | `/api/v1/organizations` | JWT | Регистрация юридического лица (с валидацией УНП) |

---

### Примеры запросов

#### 1. Регистрация пользователя (`POST /api/v1/auth/register`)
```json
{
  "phone": "+375291112233",
  "password": "Password123!",
  "first_name": "Иван",
  "last_name": "Иванов",
  "email": "ivan@example.com",
  "currencies": ["BYN", "USD", "EUR"]
}
```
**Ответ `201 Created`**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+375291112233",
  "first_name": "Иван",
  "last_name": "Иванов",
  "role": "customer",
  "status": "active",
  "created_at": "2026-10-23T10:00:00Z"
}
```

#### 2. Вход в систему (`POST /api/v1/auth/login`)
```json
{
  "phone": "+375291112233",
  "password": "Password123!"
}
```
**Ответ `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "550e8400-e29b-41d4-a716-446655440000", "phone": "+375291112233" }
}
```

#### 3. Перевод средств P2P (`POST /api/v1/transfers`)
> Заголовок: `Authorization: Bearer <JWT_TOKEN>`

Перевод по номеру телефона:
```json
{
  "recipient_type": "phone",
  "recipient": "+375292223344",
  "currency": "BYN",
  "amount": 25.50,
  "description": "Оплата за услуги"
}
```
Или перевод по номеру счета (`BY20BNKG...`):
```json
{
  "recipient_type": "account_number",
  "recipient": "BY20BNKG12345678901234567890",
  "currency": "BYN",
  "amount": 50.00
}
```
**Ответ `200 OK`**:
```json
{
  "transaction_id": "7b0d24e7-4f62-42da-9195-20703c7d678b",
  "currency": "BYN",
  "amount": 25.50,
  "status": "completed"
}
```

#### 4. Обмен валюты (`POST /api/v1/exchange`)
> Заголовок: `Authorization: Bearer <JWT_TOKEN>`
```json
{
  "from_currency": "BYN",
  "to_currency": "USD",
  "amount": 35.00
}
```
**Ответ `200 OK`**:
```json
{
  "transaction_id": "8a3e5c9b-11aa-47df-a728-1bf912953288",
  "from_currency": "BYN",
  "to_currency": "USD",
  "original_amount": 35.00,
  "converted_amount": 10.65,
  "rate": 3.2850,
  "status": "completed"
}
```

#### 5. Регистрация организации (`POST /api/v1/organizations`)
> Заголовок: `Authorization: Bearer <JWT_TOKEN>`
```json
{
  "unp": "100000007",
  "company_name": "ООО ФинТех Солюшнс",
  "legal_address": "г. Минск, ул. Немига, д. 5",
  "contact_name": "Иван Иванов",
  "currencies": ["BYN", "USD"]
}
```
**Ответ `201 Created`**:
```json
{
  "organization_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "unp": "100000007",
  "company_name": "ООО ФинТех Солюшнс",
  "status": "verified",
  "account_number": "BY20BNKG12345678901234567890"
}
```

---

## 🗄 База данных и схема

База данных построена на реляционной модели PostgreSQL со строгими ограничениями целостности:

- `users` — пользователи (роли `customer`/`admin`/`support`, статусы, тип клиента `individual`/`company`).
- `accounts` — банковские счета (уникальный номер `BY20BNKG...`, тип `user`/`system`).
- `account_balances` — мультивалютные балансы кошельков (`CHECK (balance >= 0)`).
- `exchange_rates` — история и актуальные курсы валют от НБРБ.
- `transactions` — мастер-реестр транзакций (`transfer`, `exchange`, `deposit`).
- `entries` — проводки двойной записи (пары `debit` и `credit`).
- `organizations` — реквизиты компаний (УНП с проверкой контрольной суммы, адрес, статус верификации).

---

## ⚙️ Конфигурация (.env)

Создайте файл `backend-banking/.env`:

```env
SERVER_PORT=8080
DATABASE_URL=postgres://ledger_user:ledger_password@localhost:5432/bank_ledger?sslmode=disable
REDIS_ADDR=localhost:6379
KAFKA_BROKERS=localhost:29092
LOG_LEVEL=debug
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
```

---

## 🚀 Запуск проекта

### Вариант 1: Через Docker Compose (рекомендуется)

1. Запустите инфраструктуру:
   ```bash
   cd backend-banking
   docker compose up -d --build
   ```

2. Примените SQL-миграции в базу данных:
   ```bash
   for f in ../db/migrations/*.sql; do
       docker exec -i bank_postgres psql -U ledger_user -d bank_ledger < "$f"
   done
   ```

3. Проверьте работоспособность:
   ```bash
   curl http://localhost:8080/health
   ```

### Вариант 2: Локальный запуск

1. Убедитесь, что запущен PostgreSQL 16 и создана база `bank_ledger`.
2. Примените файлы миграций из папки `db/migrations/` по порядку (от `01_` до `08_`).
3. Запустите приложение:
   ```bash
   cd backend-banking
   go run ./cmd/api/main.go
   ```
Сервер будет доступен по адресу `http://localhost:8080`.
