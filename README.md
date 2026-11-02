# Banking Ledger & Web Client 💳🏛️

[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?style=flat&logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)

Полнофункциональная банковская система (Core Banking Ledger & Client Portal):
1. **Бэкенд на Go**: высоконадежная бухгалтерская книга двойной записи (**Double-Entry Bookkeeping**), защита от состояний гонки (**Race Conditions**) и взаимоблокировок (**Deadlocks**), мультивалютные счета, регистрация организаций (B2B) и автоматическая синхронизация официальных курсов валют с НБРБ.
2. **Фронтенд на React 19 + TypeScript**: современный, отзывчивый клиентский веб-кабинет с поддержкой десктопного сайдбара, мобильной нижней панели (Bottom Nav), светлой/тёмной тем, мультивалютных кошельков, переводов, конвертации и двухрежимной работы (**Live Go API + автономный Mock-режим**).

---

## ⚡ Особенности системы

### 🏛️ Ядро бэкенда (Core Banking)
- **Бухгалтерская книга двойной записи (Double-Entry Ledger)**: каждая операция создает дебетовую и кредитовую проводки в `entries` с фиксацией мастер-транзакции в `transactions`.
- **Защита от Race Conditions и Deadlocks**: блокировка балансов `SELECT ... FOR UPDATE` с детерминированной сортировкой `ORDER BY id ASC` для математического исключения взаимных блокировок при встречных транзакциях.
- **Банковская точность вычислений (`decimal.Decimal`)**: полный отказ от типов с плавающей точкой IEEE 754 (`float64`) в пользу `shopspring/decimal` и PostgreSQL `NUMERIC` — отсутствие бинарных погрешностей округления.
- **Мультивалютность и управление кошельками**: поддержка валют `BYN`, `USD`, `EUR`, `RUB`, открытие новых кошельков к счету в один клик.
- **Курсы валют Нацбанка РБ (НБРБ)**: фоновый воркер периодически опрашивает открытый API НБРБ с учетом коэффициента масштаба (`Cur_Scale`). Расчет прямых, обратных и транзитных курсов через базовую валюту `BYN`.
- **Юридические лица (B2B)**: онбординг организаций с алгоритмической проверкой контрольной суммы белорусского УНП (по модулю 11).
- **Безопасность**: хеширование паролей `bcrypt`, JWT-аутентификация (HMAC-SHA256), валидация номеров телефонов РБ (`+375...`), защита от овердрафта на уровне СУБД (`CHECK (balance >= 0)`).

### 💻 Клиентский веб-интерфейс (Web Client)
- **Адаптивная компоновка под любые устройства**:
  - **Десктоп**: эргономичный боковой сайдбар (Sidebar) с балансом, навигацией, профилем и быстрым копированием IBAN.
  - **Мобильные устройства**: фиксированная нижняя навигационная панель (Bottom Navigation Bar) для комфортного управления одной рукой.
- **Двойной режим работы (Live + Mock)**:
  - Автоматически проверяет статус локального Go API (`http://localhost:8080/health`).
  - При недоступности бэкенда плавно переключается в автономный Mock-режим с сохранением всех операций в `localStorage` (позволяет полноценно тестировать интерфейс без поднятия БД и бэкенда).
  - Быстрый ознакомительный вход в 1 клик (**Демо-вход**).
- **Мультивалютный дашборд**:
  - Карточки балансов `BYN`, `USD`, `EUR`, `RUB`.
  - Расчет суммарного портфеля в эквиваленте BYN с функцией скрытия баланса (Privacy Mode).
  - Модальное окно открытия новых валютных счетов.
  - Лента последних транзакций с фильтрацией (Переводы, Обмен, Зачисления).
- **Переводы средств**:
  - Перевод по белорусскому номеру телефона (`+375...`) или расчетному счету IBAN (`BY20BNKG...`).
  - Процентные кнопки быстрого ввода (25%, 50%, 100% от остатка), расчет комиссии (0.00 BYN).
- **Обмен валют и калькулятор**:
  - Мгновенная конвертация между своими валютными счетами с кнопкой Swap и отображением прямого курса.
  - Таблица котировок НБРБ и конверсионный калькулятор.
- **Темы оформления**:
  - Полноценная светлая (Light) и тёмная (Dark) темы с сохранением в `localStorage`.
- **Стандарты качества (/human-code)**:
  - Векторные SVG-иконки `lucide-react` с атрибутом `aria-hidden="true"` (полный отказ от сырых эмодзи в интерфейсе).
  - Обработка 5 состояний UI: начальное, скелетоны загрузки (Shimmer), пустые списки с призывом к действию, экраны ошибок и всплывающие Toast-уведомления.

---

## 🛠 Стек технологий

| Область | Технологии |
| :--- | :--- |
| **Backend** | Go 1.22+ / 1.27, Clean Architecture, `net/http` |
| **СУБД и Хранилища** | PostgreSQL 16 (`pgxpool`), Redis 7, Apache Kafka (KRaft) |
| **Финансовая математика** | `github.com/shopspring/decimal` (PostgreSQL `NUMERIC(18,4)` и `NUMERIC(18,8)`) |
| **Безопасность бэкенда** | `golang-jwt/jwt`, `golang.org/x/crypto/bcrypt` |
| **Frontend** | React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3.4 |
| **Иконки и интерфейс** | `lucide-react`, `tailwind-merge`, `clsx` |
| **Инфраструктура** | Docker, Docker Compose |

---

## 📂 Структура репозитория

```text
├── backend-banking/                 # Серверная часть на Go
│   ├── cmd/api/main.go              # Точка входа: пул БД, зависимости и запуск HTTP-сервера
│   ├── internal/
│   │   ├── client/nbrb/             # HTTP-клиент к открытому API НБРБ
│   │   ├── domain/                  # Доменные модели (User, Account, Transfer) и генератор IBAN
│   │   ├── repository/postgres/     # Репозитории (users, accounts, balances, transfers, rates, orgs)
│   │   ├── service/                 # Бизнес-логика (Auth, Account, Transfer, Exchange, Org)
│   │   ├── transport/http/          # HTTP-хендлеры, роутер (routes.go) и JWT middleware
│   │   ├── validator/               # Валидаторы (проверка белорусского УНП по модулю 11)
│   │   └── worker/                  # Фоновый воркер синхронизации курсов валют
│   ├── Dockerfile                   # Multi-stage сборка минимального контейнера на scratch
│   └── docker-compose.yml           # Сервисы: App, PostgreSQL 16, Redis 7, Apache Kafka
├── frontend/                        # Клиентский веб-интерфейс на React 19 + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/              # Sidebar (десктоп), BottomNav (мобайл), Header, AppLayout
│   │   │   ├── modals/              # Модальное окно открытия валютного кошелька
│   │   │   └── ui/                  # Button, Input, Card, Badge, Skeleton, Modal
│   │   ├── context/                 # AuthContext, ThemeContext, ToastContext
│   │   ├── services/                # api.ts (двухрежимный клиент Live/Mock), mockStore.ts
│   │   ├── types/                   # Строгая типизация банковской предметной области
│   │   ├── utils/                   # Форматирование валют, дат, телефонов, валидаторы
│   │   ├── views/                   # AuthView, DashboardView, TransfersView, ExchangeView, RatesView
│   │   ├── App.tsx                  # Корневой компонент с роутингом по табам
│   │   └── main.tsx                 # Точка монтирования React
│   ├── package.json                 # Зависимости и скрипты фронтенда
│   ├── tailwind.config.js           # Конфигурация Tailwind CSS и тёмной темы
│   └── vite.config.ts               # Конфигурация Vite и проксирования к Go API
├── db/migrations/                   # SQL-миграции схемы базы данных PostgreSQL (01-08)
└── README.md                        # Главная и единственная документация проекта
```

---

## 📡 REST API Спецификация

| Метод | Путь | Доступ | Описание |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Публичный | Проверка жизнеспособности сервиса и подключения к БД |
| `POST` | `/api/v1/auth/register` | Публичный | Регистрация пользователя с созданием расчетного счета и кошельков |
| `POST` | `/api/v1/auth/login` | Публичный | Аутентификация пользователя и выдача сессионного JWT-токена |
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
- `accounts` — банковские расчетные счета (уникальный номер стандарта РБ вида `BY20BNKG...`).
- `account_balances` — мультивалютные балансы кошельков (`CHECK (balance >= 0)`).
- `exchange_rates` — история и актуальные курсы валют от НБРБ с коэффициентом масштаба.
- `transactions` — мастер-реестр транзакций (`transfer`, `exchange`, `deposit`).
- `entries` — бухгалтерские проводки двойной записи (пары `debit` и `credit`).
- `organizations` — реквизиты юридических лиц (УНП с проверкой контрольной суммы, адрес, статус).

---

## 🚀 Быстрый старт

### 1. Запуск фронтенда (Web Client)

Фронтенд может работать полностью автономно в **демо-режиме** без необходимости сразу запускать бэкенд:

```bash
cd frontend
npm install
npm run dev
```

Откройте в браузере **`http://localhost:5173`**. Нажмите кнопку **«Демо-вход»** для моментального входа с предзаполненными балансами в `BYN`, `USD`, `EUR`, `RUB` и историей операций.

Для сборки продакшн-бандла:
```bash
npm run build
```

---

### 2. Запуск бэкенда (Go Core Banking)

#### Вариант А: Через Docker Compose (рекомендуется)

1. Запустите стек контейнеров:
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

#### Вариант Б: Локальный запуск Go

1. Убедитесь, что запущен PostgreSQL 16 и создана база `bank_ledger`.
2. Настройте файл `backend-banking/.env`:
   ```env
   SERVER_PORT=8080
   DATABASE_URL=postgres://ledger_user:ledger_pass@localhost:5432/bank_ledger?sslmode=disable
   REDIS_ADDR=localhost:6379
   KAFKA_BROKERS=localhost:29092
   LOG_LEVEL=debug
   JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
   ```
3. Примените миграции из `db/migrations/` по порядку (от `01_` до `08_`).
4. Запустите сервис:
   ```bash
   cd backend-banking
   go run ./cmd/api/main.go
   ```
   Сервер будет доступен по адресу `http://localhost:8080`. Веб-интерфейс автоматически распознает его и отобразит статус **«Go API в сети»**.
