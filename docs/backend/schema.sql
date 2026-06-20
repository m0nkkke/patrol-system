-- ============================================================
-- Patrol System — PostgreSQL Schema
-- ============================================================
-- Порядок создания таблиц учитывает зависимости (FK)
-- Все ID — UUID v4 (gen_random_uuid())
-- Все временные метки — TIMESTAMPTZ (с таймзоной)
-- Soft delete через deleted_at (NULL = активна)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- для gen_random_uuid()

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'employee',     -- обходчик
  'manager',      -- руководитель магазина
  'admin'         -- администратор сети
);

CREATE TYPE patrol_status AS ENUM (
  'pending',      -- запланирован, ещё не начат
  'in_progress',  -- идёт прямо сейчас
  'completed',    -- завершён успешно
  'overdue',      -- просрочен (не завершён в срок)
  'cancelled'     -- отменён вручную
);

CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

-- ============================================================
-- 1. ОРГАНИЗАЦИОННАЯ СТРУКТУРА
-- ============================================================

-- Регионы / кластеры магазинов
CREATE TABLE regions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

COMMENT ON TABLE regions IS 'Регионы/кластеры для группировки магазинов';

-- Магазины
CREATE TABLE shops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id    UUID REFERENCES regions(id) ON DELETE SET NULL,
  name         VARCHAR(200) NOT NULL,
  external_id  VARCHAR(50),
  address      TEXT,
  timezone     VARCHAR(50) NOT NULL DEFAULT 'Europe/Moscow',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  route_status VARCHAR(32) NOT NULL DEFAULT 'not_configured',
  route_expected_points SMALLINT NOT NULL DEFAULT 0,
  route_registered_points SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT uq_shops_external_id UNIQUE (external_id),
  CONSTRAINT chk_shops_route_points CHECK (route_registered_points <= route_expected_points),
  CONSTRAINT chk_shops_route_status CHECK (route_status IN ('not_configured', 'setup_in_progress', 'ready'))
);

COMMENT ON TABLE shops IS 'Магазины сети';
COMMENT ON COLUMN shops.external_id IS 'ID магазина из операционного контура заказчика';
COMMENT ON COLUMN shops.timezone IS 'Таймзона для корректного отображения расписания';
COMMENT ON COLUMN shops.route_status IS 'Статус готовности цифрового маршрута магазина';

CREATE INDEX idx_shops_region_id  ON shops(region_id);
CREATE INDEX idx_shops_external_id ON shops(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_shops_is_active  ON shops(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_shops_route_status ON shops(route_status);
CREATE INDEX idx_shops_deleted_at ON shops(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. ПОЛЬЗОВАТЕЛИ
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID REFERENCES shops(id) ON DELETE SET NULL,
  role          user_role NOT NULL DEFAULT 'employee',
  full_name     VARCHAR(200) NOT NULL,
  username      VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  access_key    VARCHAR(32),
  access_key_hash VARCHAR(64),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,

  CONSTRAINT uq_users_username UNIQUE (username)
);

COMMENT ON TABLE users IS 'Пользователи системы: обходчики, руководители, администраторы';
COMMENT ON COLUMN users.shop_id IS 'NULL для admin — они не привязаны к конкретному магазину';
COMMENT ON COLUMN users.username IS 'Внутренний уникальный идентификатор пользователя; не используется для входа в мобильное приложение';
COMMENT ON COLUMN users.password_hash IS 'Legacy-поле. Для входа используется постоянный access_key/access_key_hash';
COMMENT ON COLUMN users.access_key IS 'Постоянный человекочитаемый ключ входа, доступный администратору';
COMMENT ON COLUMN users.access_key_hash IS 'SHA-256 от нормализованного access_key для поиска пользователя при входе';

CREATE INDEX idx_users_shop_id   ON users(shop_id);
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_access_key ON users(access_key) WHERE access_key IS NOT NULL;
CREATE UNIQUE INDEX uq_users_access_key_hash ON users(access_key_hash) WHERE access_key_hash IS NOT NULL;

-- Refresh-токены (основное хранение в Redis, здесь — аудит)
CREATE TABLE refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,           -- SHA-256 от токена
  device_id     VARCHAR(200),
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

COMMENT ON TABLE refresh_tokens IS 'Аудит refresh-токенов. Актуальные токены хранятся в Redis';

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================
-- 3. NFC-МЕТКИ И КОНТРОЛЬНЫЕ ТОЧКИ
-- ============================================================

-- NFC-метки (физические чипы)
CREATE TABLE nfc_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid          VARCHAR(32) NOT NULL,     -- аппаратный UID чипа (нижний регистр)
  payload      VARCHAR(100),             -- содержимое метки
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_nfc_tags_uid UNIQUE (uid),
  CONSTRAINT chk_nfc_tags_uid_lowercase CHECK (uid = LOWER(uid))
);

COMMENT ON TABLE nfc_tags IS 'Физические NFC-метки NTAG215. UID всегда в нижнем регистре';
COMMENT ON COLUMN nfc_tags.uid IS 'Аппаратный UID чипа. Нижний регистр, нормализуется при записи';
COMMENT ON COLUMN nfc_tags.payload IS 'Содержимое метки (point_id + токен)';

CREATE INDEX idx_nfc_tags_uid       ON nfc_tags(uid);
CREATE INDEX idx_nfc_tags_is_active ON nfc_tags(is_active) WHERE is_active = TRUE;

-- Контрольные точки
CREATE TABLE patrol_points (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  nfc_tag_id   UUID REFERENCES nfc_tags(id) ON DELETE SET NULL,
  name         VARCHAR(200) NOT NULL,    -- "Электрощитовая", "Котельная"
  description  TEXT,
  sort_order   SMALLINT NOT NULL DEFAULT 0,  -- порядок в маршруте
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

COMMENT ON TABLE patrol_points IS 'Контрольные точки обхода в магазине';
COMMENT ON COLUMN patrol_points.sort_order IS 'Порядок точки в маршруте';

CREATE INDEX idx_patrol_points_shop_id    ON patrol_points(shop_id);
CREATE INDEX idx_patrol_points_nfc_tag_id ON patrol_points(nfc_tag_id);
CREATE INDEX idx_patrol_points_is_active  ON patrol_points(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_patrol_points_deleted_at ON patrol_points(deleted_at) WHERE deleted_at IS NULL;

-- История замен NFC-меток на контрольных точках
CREATE TABLE nfc_tag_replacements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE CASCADE,
  old_nfc_tag_id  UUID REFERENCES nfc_tags(id) ON DELETE SET NULL,
  old_nfc_uid     VARCHAR(32),
  new_nfc_tag_id  UUID NOT NULL REFERENCES nfc_tags(id) ON DELETE RESTRICT,
  new_nfc_uid     VARCHAR(32) NOT NULL,
  replaced_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reason          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nfc_tag_replacements IS 'История замен физических NFC-меток на контрольных точках';
COMMENT ON COLUMN nfc_tag_replacements.old_nfc_uid IS 'Копия старого UID для аудита после архивирования метки';
COMMENT ON COLUMN nfc_tag_replacements.new_nfc_uid IS 'Копия нового UID, привязанного к точке';

CREATE INDEX idx_nfc_tag_replacements_patrol_point_id ON nfc_tag_replacements(patrol_point_id);
CREATE INDEX idx_nfc_tag_replacements_created_at ON nfc_tag_replacements(created_at DESC);

-- ============================================================
-- 4. РАСПИСАНИЕ ОБХОДОВ
-- ============================================================

-- Шаблон расписания (когда должен быть обход)
CREATE TABLE patrol_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name           VARCHAR(200) NOT NULL,       -- "Ночной обход", "Дневной"
  -- дни недели: массив [1=Пн, 2=Вт, ..., 7=Вс]
  weekdays       SMALLINT[] NOT NULL,
  start_time     TIME NOT NULL,               -- время начала окна
  end_time       TIME NOT NULL,               -- время конца окна (дедлайн)
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);

COMMENT ON TABLE patrol_schedules IS 'Шаблоны расписания обходов по магазину';
COMMENT ON COLUMN patrol_schedules.weekdays IS 'Массив дней: 1=Пн...7=Вс';

CREATE INDEX idx_patrol_schedules_shop_id   ON patrol_schedules(shop_id);
CREATE INDEX idx_patrol_schedules_is_active ON patrol_schedules(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 5. ОБХОДЫ И СОБЫТИЯ
-- ============================================================

-- Обход (один конкретный обход сотрудника)
CREATE TABLE patrols (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  schedule_id     UUID REFERENCES patrol_schedules(id) ON DELETE SET NULL,
  status          patrol_status NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,           -- дедлайн завершения
  total_points    SMALLINT NOT NULL DEFAULT 0,  -- сколько точек в маршруте
  scanned_points  SMALLINT NOT NULL DEFAULT 0,  -- сколько отсканировано
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_patrols_points CHECK (scanned_points <= total_points),
  CONSTRAINT chk_patrols_dates  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

COMMENT ON TABLE patrols IS 'Один конкретный обход сотрудника';
COMMENT ON COLUMN patrols.due_at IS 'Дедлайн из расписания. NULL = внеплановый обход';
COMMENT ON COLUMN patrols.total_points IS 'Кэш: кол-во точек на момент старта обхода';

CREATE INDEX idx_patrols_shop_id      ON patrols(shop_id);
CREATE INDEX idx_patrols_employee_id  ON patrols(employee_id);
CREATE INDEX idx_patrols_status       ON patrols(status);
CREATE INDEX idx_patrols_started_at   ON patrols(started_at DESC);
CREATE INDEX idx_patrols_due_at       ON patrols(due_at) WHERE status IN ('pending', 'in_progress');
-- Составной индекс для отчётов по магазину за период
CREATE INDEX idx_patrols_shop_started ON patrols(shop_id, started_at DESC);

-- Событие сканирования NFC (факт прохождения точки)
CREATE TABLE patrol_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_id       UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
  patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE RESTRICT,
  nfc_tag_id      UUID NOT NULL REFERENCES nfc_tags(id) ON DELETE RESTRICT,
  employee_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Данные сканирования
  scanned_at      TIMESTAMPTZ NOT NULL,        -- время на устройстве
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- время на сервере
  nfc_uid         VARCHAR(32) NOT NULL,        -- UID из метки (для аудита)
  device_id       VARCHAR(200) NOT NULL,       -- fingerprint устройства
  ip_address      INET,

  -- Геолокация (вспомогательно)
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  gps_accuracy    REAL,                        -- точность GPS в метрах

  -- Антифрод
  is_suspicious   BOOLEAN NOT NULL DEFAULT FALSE,
  suspicion_reason TEXT,                       -- причина если is_suspicious=TRUE

  -- Офлайн-синхронизация: разрешение конфликтов (см. CONSTITUTION §16)
  client_local_id UUID,                        -- UUID, сгенерированный на устройстве (идемпотентность синка)
  point_deactivated_after_scan BOOLEAN NOT NULL DEFAULT FALSE, -- точка деактивирована после сканирования
  late_sync       BOOLEAN NOT NULL DEFAULT FALSE,              -- событие пришло после завершения/отмены обхода

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Одна точка — одно событие в рамках обхода
  CONSTRAINT uq_patrol_event_point UNIQUE (patrol_id, patrol_point_id)
);

COMMENT ON TABLE patrol_events IS 'Событие сканирования NFC — факт прохождения контрольной точки';
COMMENT ON COLUMN patrol_events.scanned_at IS 'Время на устройстве (может отличаться от received_at в офлайн-режиме)';
COMMENT ON COLUMN patrol_events.nfc_uid IS 'Копия UID для аудита на случай деактивации метки';
COMMENT ON COLUMN patrol_events.is_suspicious IS 'Флаг антифрода: слишком быстрый маршрут, аномальный GPS и т.п.';
COMMENT ON COLUMN patrol_events.client_local_id IS 'UUID с устройства для идемпотентной синхронизации офлайн-событий';
COMMENT ON COLUMN patrol_events.point_deactivated_after_scan IS 'TRUE если точка была деактивирована после момента сканирования';
COMMENT ON COLUMN patrol_events.late_sync IS 'TRUE если событие синхронизировано после завершения/отмены обхода';

CREATE INDEX idx_patrol_events_patrol_id       ON patrol_events(patrol_id);
CREATE INDEX idx_patrol_events_employee_id     ON patrol_events(employee_id);
CREATE INDEX idx_patrol_events_patrol_point_id ON patrol_events(patrol_point_id);
CREATE INDEX idx_patrol_events_nfc_uid         ON patrol_events(nfc_uid);
CREATE INDEX idx_patrol_events_scanned_at      ON patrol_events(scanned_at DESC);
CREATE INDEX idx_patrol_events_is_suspicious   ON patrol_events(is_suspicious) WHERE is_suspicious = TRUE;

-- Идемпотентность синка: один localId с устройства = одно событие на сервере
CREATE UNIQUE INDEX uq_patrol_events_client_local_id
  ON patrol_events(client_local_id) WHERE client_local_id IS NOT NULL;

-- Эталонные интервалы маршрута, снятые с первого корректного обхода
CREATE TABLE patrol_route_intervals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  from_patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE CASCADE,
  to_patrol_point_id   UUID NOT NULL REFERENCES patrol_points(id) ON DELETE CASCADE,
  from_sort_order      SMALLINT NOT NULL,
  to_sort_order        SMALLINT NOT NULL,
  baseline_seconds     INTEGER NOT NULL,
  min_seconds          INTEGER NOT NULL,
  max_seconds          INTEGER NOT NULL,
  source_patrol_id     UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_patrol_route_interval_points UNIQUE (shop_id, from_patrol_point_id, to_patrol_point_id),
  CONSTRAINT chk_patrol_route_interval_seconds CHECK (baseline_seconds >= 0 AND min_seconds >= 0 AND max_seconds >= min_seconds)
);

COMMENT ON TABLE patrol_route_intervals IS 'Эталонные интервалы между соседними точками маршрута';
COMMENT ON COLUMN patrol_route_intervals.baseline_seconds IS 'Интервал из первого корректного обхода';
COMMENT ON COLUMN patrol_route_intervals.min_seconds IS 'Нижний допустимый порог для антифрода';
COMMENT ON COLUMN patrol_route_intervals.max_seconds IS 'Верхний допустимый порог для антифрода';

CREATE INDEX idx_patrol_route_intervals_shop_id ON patrol_route_intervals(shop_id);

-- Инциденты обходов: пропуски точек и подозрительные интервалы
CREATE TABLE patrol_incidents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  patrol_id            UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
  patrol_event_id      UUID REFERENCES patrol_events(id) ON DELETE SET NULL,
  type                 VARCHAR(50) NOT NULL,
  from_patrol_point_id UUID REFERENCES patrol_points(id) ON DELETE SET NULL,
  to_patrol_point_id   UUID REFERENCES patrol_points(id) ON DELETE SET NULL,
  expected_seconds     INTEGER,
  actual_seconds       INTEGER,
  message              TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_patrol_incident_type CHECK (type IN ('short_interval', 'long_interval', 'missed_point'))
);

COMMENT ON TABLE patrol_incidents IS 'Инциденты обхода: пропущенные точки, слишком короткие и слишком длинные интервалы';
COMMENT ON COLUMN patrol_incidents.expected_seconds IS 'Эталонный интервал, если применимо';
COMMENT ON COLUMN patrol_incidents.actual_seconds IS 'Фактический интервал, если применимо';

CREATE INDEX idx_patrol_incidents_shop_id ON patrol_incidents(shop_id);
CREATE INDEX idx_patrol_incidents_patrol_id ON patrol_incidents(patrol_id);
CREATE INDEX idx_patrol_incidents_type ON patrol_incidents(type);
CREATE INDEX idx_patrol_incidents_created_at ON patrol_incidents(created_at DESC);

-- ============================================================
-- 6. АЛЕРТЫ И УВЕДОМЛЕНИЯ
-- ============================================================

CREATE TABLE alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID REFERENCES shops(id) ON DELETE CASCADE,
  patrol_id    UUID REFERENCES patrols(id) ON DELETE SET NULL,
  severity     alert_severity NOT NULL DEFAULT 'warning',
  type         VARCHAR(100) NOT NULL,    -- 'patrol_overdue', 'suspicious_scan' и т.д.
  title        VARCHAR(300) NOT NULL,
  body         TEXT,
  is_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMPTZ,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alerts IS 'Алерты системы: просрочки, подозрительные сканирования, системные события';
COMMENT ON COLUMN alerts.type IS 'patrol_overdue | patrol_missed | suspicious_scan | system_error';

CREATE INDEX idx_alerts_shop_id    ON alerts(shop_id);
CREATE INDEX idx_alerts_patrol_id  ON alerts(patrol_id);
CREATE INDEX idx_alerts_severity   ON alerts(severity);
CREATE INDEX idx_alerts_is_sent    ON alerts(is_sent) WHERE is_sent = FALSE;
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- ============================================================
-- 7. AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,       -- bigserial для высокой частоты записи
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action       VARCHAR(100) NOT NULL,       -- 'nfc.scan', 'patrol.complete', 'user.login'
  entity_type  VARCHAR(100),               -- 'patrol', 'patrol_point', 'user'
  entity_id    UUID,
  ip_address   INET,
  device_id    VARCHAR(200),
  meta         JSONB,                      -- дополнительные данные события
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Полный лог действий для аудита. BIGSERIAL для производительности';
COMMENT ON COLUMN audit_log.meta IS 'Произвольные данные события: { uid, lat, lng, reason... }';

CREATE INDEX idx_audit_log_user_id     ON audit_log(user_id);
CREATE INDEX idx_audit_log_action      ON audit_log(action);
CREATE INDEX idx_audit_log_entity      ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at  ON audit_log(created_at DESC);
-- GIN-индекс для поиска по JSONB
CREATE INDEX idx_audit_log_meta        ON audit_log USING GIN(meta);

-- ============================================================
-- ФУНКЦИЯ: автообновление updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер ко всем таблицам с updated_at
CREATE TRIGGER trg_regions_updated_at        BEFORE UPDATE ON regions        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shops_updated_at          BEFORE UPDATE ON shops          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_nfc_tags_updated_at       BEFORE UPDATE ON nfc_tags       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patrol_points_updated_at  BEFORE UPDATE ON patrol_points  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patrol_schedules_updated_at BEFORE UPDATE ON patrol_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patrols_updated_at        BEFORE UPDATE ON patrols        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patrol_route_intervals_updated_at BEFORE UPDATE ON patrol_route_intervals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
