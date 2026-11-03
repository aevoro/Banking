# Banking Ledger API 💳🏛️

[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?style=flat&logo=go)](https://golang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis)](https://redis.io)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-3.7-231F20?style=flat&logo=apachekafka)](https://kafka.apache.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)

Высоконадежный бэкенд банковского сервиса (Core Banking / Ledger) на **Go**, спроектированный по принципам **Clean Architecture** с использованием бухгалтерской модели двойной записи (**Double-Entry Bookkeeping**), защитой от состояний гонки (**Race Conditions**) и взаимоблокировок (**Deadlocks**), гарантированной идемпотентностью операций (**Idempotency-Key** на Redis), асинхронной публикацией событий в Apache Kafka через **Transactional Outbox Pattern**, мультивалютными счетами, регистрацией организаций (B2B) и автоматической синхронизацией официальных курсов валют с НБРБ.

---

## ⚡ Особенности системы

- **Бухгалтерская книга двойной записи (Double-Entry Ledger)**: каждая операция создает дебетовую и кредитовую проводки в таблице `entries` с сохранением мастер-транзакции в `transactions`.
- **Защита от Race Conditions и Deadlocks**: блокировка балансов `SELECT ... FOR UPDATE` со строгой детерминированной сортировкой `ORDER BY id ASC` для математического исключения взаимных блокировок при встречных транзакциях.
- **Идемпотентность финансовых транзакций (Idempotency Key)**: заголовок `Idempotency-Key: <UUID>` с распределенными блокировками и кэшированием результатов в Redis на 24 часа. Исключает двойные списания при нестабильном сетевом соединении.
- **Transactional Outbox Pattern & Apache Kafka**: гарантированная асинхронная доставка событий (`bank-transfers`) через таблицу `outbox` в PostgreSQL и фоновый воркер `OutboxRelayWorker` (2-секундный polling с автоматическим retry и логированием ошибок).
- **Банковская точность вычислений (`decimal.Decimal`)**: полный отказ от типов с плавающей точкой IEEE 754 (`float64`) в пользу `shopspring/decimal` и PostgreSQL `NUMERIC(18, 4)` / `NUMERIC(18, 8)` — отсутствие бинарных погрешностей округления.
- **Мультивалютность и управление кошельками**: поддержка валют `BYN`, `USD`, `EUR`, `RUB`, открытие новых валютных кошельков к счету в любой момент и просмотр актуальных остатков.
- **Курсы валют Нацбанка РБ (НБРБ)**: фоновый воркер периодически опрашивает открытый API НБРБ с учетом коэффициента масштаба (`Cur_Scale`). Расчет прямых, обратных и транзитных курсов через базовую валюту `BYN`.
- **Юридические лица (B2B)**: онбординг организаций с алгоритмической проверкой контрольной суммы белорусского УНП (по модулю 11).
- **Безопасность**: хеширование паролей `bcrypt`, JWT-аутентификация (HMAC-SHA256), валидация номеров телефонов РБ (`+375...`), защита от овердрафта на уровне СУБД (`CHECK (balance >= 0)`).

---

## 🛠 Стек технологий

| Компонент | Технологии |
| :--- | :--- |
| **Язык разработки** | Go 1.22+ / 1.27 (Clean Architecture, стандартная библиотека `net/http`) |
| **СУБД** | PostgreSQL 16 (драйвер `jackc/pgx/v5` + пул соединений `pgxpool`) |
| **Распределенный кэш и блокировки** | Redis 7 (`github.com/redis/go-redis/v9`) |
| **Шина сообщений и событий** | Apache Kafka 3.7 (`github.com/segmentio/kafka-go`) |
| **Финансовая точность** | `github.com/shopspring/decimal` (PostgreSQL `NUMERIC(18,4)` и `NUMERIC(18,8)`) |
| **Безопасность и криптография** | `golang-jwt/jwt`, `golang.org/x/crypto/bcrypt` |
| **Контейнеризация** | Docker, Docker Compose |

---

## 📂 Структура репозитория

```text
├── backend-banking/                 # Серверная часть на Go
│   ├── cmd/api/main.go              # Точка входа: инициализация пула БД, Redis, Kafka и запуск сервера
│   ├── internal/
│   │   ├── client/nbrb/             # HTTP-клиент к открытому API Нацбанка РБ (НБРБ)
│   │   ├── domain/                  # Доменные модели (User, Account, Transfer) и генератор счетов IBAN
│   │   ├── repository/postgres/     # Репозитории (users, accounts, balances, transfers, rates, orgs)
│   │   ├── service/                 # Бизнес-логика (Auth, Account, Transfer, Exchange, Org)
│   │   ├── storage/redis/           # Клиент Redis и работа с Idempotency-Key
│   │   ├── transport/http/          # HTTP-хендлеры, роутер (routes.go), JWT и Idempotency middleware
│   │   ├── transport/kafka/         # Продюсер сообщений Apache Kafka
│   │   ├── validator/               # Валидаторы (проверка белорусского УНП по модулю 11)
│   │   └── worker/                  # Фоновые воркеры (курсы НБРБ, Outbox Relay в Kafka)
│   ├── Dockerfile                   # Multi-stage сборка минимального контейнера на scratch
│   └── docker-compose.yml           # Сервисы: App, PostgreSQL 16, Redis 7, Apache Kafka
├── db/migrations/                   # SQL-миграции схемы базы данных PostgreSQL (01-08)
└── README.md                        # Главная документация проекта
```

---

## 📡 REST API Спецификация

| Метод | Путь | Доступ | Описание |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Публичный | Проверка готовности сервиса, подключения к PostgreSQL и Redis |
| `POST` | `/api/v1/auth/register` | Публичный | Регистрация пользователя с созданием расчетного счета и кошельков |
| `POST` | `/api/v1/auth/login` | Публичный | Аутентификация пользователя и выдача сессионного JWT-токена |
| `GET` | `/api/v1/accounts` | JWT | Просмотр счета и списка валютных балансов пользователя |
| `POST` | `/api/v1/accounts/balances` | JWT | Открытие нового валютного кошелька (`BYN`, `USD`, `EUR`, `RUB`) |
| `GET` | `/api/v1/exchange/convert` | Публичный | Калькулятор конвертации валют (прямой, обратный и кросс-курс) |
| `POST` | `/api/v1/transfers` | JWT + Idemp | Внутренний перевод средств (поддержка заголовка `Idempotency-Key`) |
| `POST` | `/api/v1/exchange` | JWT + Idemp | Конвертация средств между своими счетами (поддержка `Idempotency-Key`) |
| `POST` | `/api/v1/organizations` | JWT | Регистрация юридического лица (с валидацией УНП) |

---

## 🗄 База данных и схема

База данных построена на реляционной модели PostgreSQL со строгими ограничениями целостности:

- `users` — пользователи (роли `customer`/`admin`/`support`, статусы, тип клиента `individual`/`company`).
- `accounts` — банковские расчетные счета (уникальный номер стандарта РБ вида `BY20BNKG...`).
- `account_balances` — мультивалютные балансы кошельков (`CHECK (balance >= 0)`).
- `exchange_rates` — история и актуальные курсы валют от НБРБ с коэффициентом масштаба.
- `transactions` — мастер-реестр транзакций (`transfer`, `exchange`, `deposit`).
- `entries` — бухгалтерские проводки двойной записи (пары `debit` и `credit`).
- `outbox` — очередь событий Transactional Outbox Pattern для гарантированной отправки в Kafka (`pending`, `published`, `failed`).
- `organizations` — реквизиты юридических лиц (УНП с проверкой контрольной суммы, адрес, статус).

---

## 🚀 Запуск проекта

### Вариант 1: Через Docker Compose (рекомендуется)

1. Запустите инфраструктуру и приложение:
   ```bash
   cd backend-banking
   docker compose up -d --build
   ```

2. Примените SQL-миграции базы данных:
   ```bash
   for f in ../db/migrations/*.sql; do
       docker exec -i bank_postgres psql -U ledger_user -d bank_ledger < "$f"
   done
   ```

3. Проверьте статус готовности сервиса:
   ```bash
   curl http://localhost:8080/health
   ```

### Вариант 2: Локальный запуск

1. Убедитесь, что запущены PostgreSQL 16, Redis 7 и Kafka (можно запустить только зависимости через `docker compose up -d postgres redis kafka`).
2. Настройте файл `backend-banking/.env`:
   ```env
   SERVER_PORT=8080
   DATABASE_URL=postgres://<user>:<password>@localhost:5432/<dbname>?sslmode=disable
   REDIS_ADDR=localhost:6379
   KAFKA_BROKERS=localhost:29092
   LOG_LEVEL=debug
   JWT_SECRET=<your_jwt_secret_key_min_32_characters_long>
   ```
3. Примените миграции из `db/migrations/` по порядку (от `01_` до `08_`).
4. Запустите бэкенд:
   ```bash
   cd backend-banking
   go run ./cmd/api/main.go
   ```
   Сервер будет доступен по адресу `http://localhost:8080`.
