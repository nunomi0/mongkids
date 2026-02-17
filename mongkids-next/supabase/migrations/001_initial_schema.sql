-- ============================================================
-- 몽키즈 클라이밍 학원 관리 시스템 - 초기 스키마
-- Supabase (PostgreSQL) Migration
-- ============================================================

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. branches (지점)
-- ============================================================
CREATE TABLE branches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. students (학생)
-- ============================================================
CREATE TABLE students (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         uuid NOT NULL REFERENCES branches(id),
  name              text NOT NULL,
  birth_date        date NOT NULL,
  gender            text NOT NULL CHECK (gender IN ('남', '여')),
  phone             text NOT NULL DEFAULT '',
  shoe_size         text NOT NULL DEFAULT '',
  status            text NOT NULL CHECK (status IN ('재원', '휴원', '퇴원', '체험')),
  category          text NOT NULL CHECK (category IN ('스페셜', '어린이', '청소년', '성인')),
  sessions_per_week smallint NOT NULL CHECK (sessions_per_week BETWEEN 1 AND 3),
  current_level     text CHECK (current_level IN ('WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD')),
  memo              text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_branch_status ON students(branch_id, status);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. student_schedules (수업 시간표)
-- ============================================================
CREATE TABLE student_schedules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  weekday    smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  time       text NOT NULL,
  group_type text NOT NULL CHECK (group_type IN ('일반1', '일반2', '스페셜', '체험')),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (student_id, weekday, time)
);

-- ============================================================
-- 4. student_levels (레벨 히스토리)
-- ============================================================
CREATE TABLE student_levels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  level         text NOT NULL CHECK (level IN ('WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD')),
  acquired_date date,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (student_id, level)
);

-- ============================================================
-- 5. payments (결제)
-- ============================================================
CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  target_month text NOT NULL,
  amount       integer NOT NULL,
  method       text NOT NULL CHECK (method IN ('계좌이체', '카드결제', '스포츠바우처', '현금')),
  discounts    jsonb NOT NULL DEFAULT '[]'::jsonb,
  memo         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_target_month ON payments(target_month);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. classes (수업 인스턴스)
-- ============================================================
CREATE TABLE classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id  uuid NOT NULL REFERENCES branches(id),
  date       date NOT NULL,
  time       text NOT NULL,
  group_type text NOT NULL CHECK (group_type IN ('일반1', '일반2', '스페셜', '체험')),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, date, time, group_type)
);

CREATE INDEX idx_classes_branch_date ON classes(branch_id, date);

-- ============================================================
-- 7. attendance (출석)
-- ============================================================
CREATE TABLE attendance (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               uuid NOT NULL REFERENCES students(id),
  class_id                 uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status                   text NOT NULL DEFAULT '예정'
                             CHECK (status IN ('예정', '출석', '결석', '보강예정', '보강완료')),
  makeup_of_attendance_id  uuid REFERENCES attendance(id),
  is_test                  boolean NOT NULL DEFAULT false,
  test_level               text CHECK (test_level IN ('WHITE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD')),
  memo                     text NOT NULL DEFAULT '',
  created_at               timestamptz NOT NULL DEFAULT now(),

  UNIQUE (student_id, class_id)
);

CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_student_status ON attendance(student_id, status);

-- ============================================================
-- 8. trial_reservations (체험 예약)
-- ============================================================
CREATE TABLE trial_reservations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id  uuid NOT NULL REFERENCES branches(id),
  name       text NOT NULL,
  phone      text NOT NULL,
  gender     text NOT NULL DEFAULT '' CHECK (gender IN ('', '남', '여')),
  grade      text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT '예정' CHECK (status IN ('예정', '노쇼', '미등록', '등록')),
  class_id   uuid REFERENCES classes(id),
  student_id uuid REFERENCES students(id),
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trial_reservations_branch_status ON trial_reservations(branch_id, status);
CREATE INDEX idx_trial_reservations_class ON trial_reservations(class_id);

-- ============================================================
-- 9. level_test_configs (레벨별 테스트 주기 설정 - 전체 지점 공통)
-- ============================================================
CREATE TABLE level_test_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level            text NOT NULL UNIQUE CHECK (level IN ('YELLOW', 'GREEN', 'BLUE', 'RED', 'BLACK', 'GOLD')),
  required_months  smallint NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 시드 데이터: level_test_configs
-- ============================================================
INSERT INTO level_test_configs (level, required_months) VALUES
  ('YELLOW', 2),
  ('GREEN',  2),
  ('BLUE',   3),
  ('RED',    4),
  ('BLACK',  5),
  ('GOLD',   6);
