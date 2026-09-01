CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(255),
    instructions TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS ix_medications_active ON medications(active);

CREATE TABLE IF NOT EXISTS medication_schedules (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    time_of_day TIME NOT NULL,
    days_of_week VARCHAR(50) NOT NULL DEFAULT '0,1,2,3,4,5,6',
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ix_medication_schedules_medication_id
ON medication_schedules(medication_id);

CREATE TABLE IF NOT EXISTS medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ,
    action VARCHAR(30) NOT NULL,
    taken_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_medication_logs_medication_id
ON medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS ix_medication_logs_scheduled_for
ON medication_logs(scheduled_for);
CREATE INDEX IF NOT EXISTS ix_medication_logs_action
ON medication_logs(action);

CREATE TABLE IF NOT EXISTS allergies (
    id SERIAL PRIMARY KEY,
    substance VARCHAR(255) NOT NULL UNIQUE,
    reaction TEXT,
    severity VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_allergies_substance ON allergies(substance);

CREATE TABLE IF NOT EXISTS symptoms (
    id SERIAL PRIMARY KEY,
    symptom VARCHAR(255) NOT NULL,
    severity INTEGER,
    note TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_symptoms_symptom ON symptoms(symptom);
CREATE INDEX IF NOT EXISTS ix_symptoms_occurred_at ON symptoms(occurred_at);

CREATE TABLE IF NOT EXISTS meals (
    id SERIAL PRIMARY KEY,
    meal_type VARCHAR(30),
    title VARCHAR(255),
    note TEXT,
    eaten_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_meals_eaten_at ON meals(eaten_at);

CREATE TABLE IF NOT EXISTS meal_ingredients (
    id SERIAL PRIMARY KEY,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    ingredient VARCHAR(255) NOT NULL,
    amount VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS ix_meal_ingredients_meal_id ON meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS ix_meal_ingredients_ingredient ON meal_ingredients(ingredient);

CREATE TABLE IF NOT EXISTS safety_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(50) NOT NULL,
    subject_a VARCHAR(255) NOT NULL,
    subject_b VARCHAR(255) NOT NULL,
    severity VARCHAR(30) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url TEXT,
    source_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_safety_rules_rule_type ON safety_rules(rule_type);
CREATE INDEX IF NOT EXISTS ix_safety_rules_subject_a ON safety_rules(subject_a);
CREATE INDEX IF NOT EXISTS ix_safety_rules_subject_b ON safety_rules(subject_b);
