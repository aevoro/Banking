# Banking Ledger API 💳🏛️

[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?style=flat&logo=go)](https://golang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)

Высоконадежный бэкенд банковского сервиса (Core Banking / Ledger) на **Go**, спроектированный по принципам **Clean Architecture** с использованием бухгалтерской модели двойной записи (**Double-Entry Bookkeeping**), защитой от состояний гонки (**Race Conditions**) и взаимоблокировок (**Deadlocks**), мультивалютными счетами, регистрацией организаций (B2B) и автоматической синхронизацией курсов валют с НБРБ.

---

## ⚡ Особенности

- **Бухгалтерская книга двойной записи (Double-Entry Ledger)**: Каждая операция создает проводки `debit` и `credit` в таблице `entries` с сохранением мастер-транзакции в `transactions`.
- **Защита от Race Conditions и Deadlocks**: Блокировка балансов `SELECT ... FOR UPDATE` со строгой детерминированной сортировкой `ORDER BY id ASC` для математического исключения дедлоков при встречных транзакциях.
- **Банковская точность вычислений (`decimal.Decimal`)**: Полный отказ от типов с плавающей точкой IEEE 754 (`float64`) в пользу `shopspring/decimal` и PostgreSQL `NUMERIC` — исключает любые бинарные погрешности округления.
- **Мультивалютность и управление кошельками**: Поддержка валют `BYN`, `USD`, `EUR`, `RUB`. Возможность открывать новые валютные кошельки к счету в любой момент и просматривать актуальные остатки.
- **Кросс-курсы и интеграция с Нацбанком РБ (НБРБ)**: Фоновый воркер периодически опрашивает открытый API НБРБ с учетом коэффициента масштаба (`Cur_Scale`). Расчет прямых, обратных и транзитных курсов через базовую валюту `BYN`.
- **Юридические лица (B2B)**: Онбординг организаций с алгоритмической проверкой контрольной суммы белорусского УНП (по модулю 11).
- **Безопасность**: Хеширование паролей `bcrypt`, аутентификация по `JWT` (HMAC-SHA256), валидация номеров телефонов РБ (`+375...`), защита от овердрафта на уровне СУБД (`CHECK (balance >= 0)`).

---

## 🛠 Стек технологий

| Компонент | Технологии |
| :--- | :--- |
| **Язык** | Go 1.22+ / 1.27 |
| **СУБД** | PostgreSQL 16 (драйвер `jackc/pgx/v5` + `pgxpool`) |
| **Финансовая математика** | `github.com/shopspring/decimal` (PostgreSQL `NUMERIC(18,4)` и `NUMERIC(18,8)`) |
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
│   │   ├── service/                  # Бизнес-логика (Auth, Account, Transfer, Exchange, Organization)
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
| `GET` | `/api/v1/accounts` | JWT | Просмотр счета и списка валютных балансов пользователя |
| `POST` | `/api/v1/accounts/balances` | JWT | Открытие нового валютного кошелька (`BYN`, `USD`, `EUR`, `RUB`) |
| `GET` | `/api/v1/exchange/convert` | Публичный | Калькулятор конвертации валют (прямой, обратный и кросс-курс) |
| `POST` | `/api/v1/transfers` | JWT | Внутренний перевод средств (по номеру телефона или номеру счета) |
| `POST` | `/api/v1/exchange` | JWT | Конвертация средств между своими валютными счетами |
| `POST` | `/api/v1/organizations` | JWT | Регистрация юридического лица (с валидацией УНП) |

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
DATABASE_URL=
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
