# 10x-Physio PostgreSQL Schema

## 1. Tabele

### 1.1 `profiles`
| Kolumna | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, FK → `auth.users.id`, NOT NULL | Identyfikator użytkownika Supabase (fizjoterapeuty).
| `first_name` | `text` | NOT NULL | Imię fizjoterapeuty.
| `last_name` | `text` | NOT NULL | Nazwisko fizjoterapeuty.
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Data utworzenia rekordu.
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Aktualizowana przez trigger `moddatetime` po każdej zmianie.

### 1.2 `patients`
| Kolumna | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, NOT NULL DEFAULT `gen_random_uuid()` | Identyfikator pacjenta.
| `therapist_id` | `uuid` | FK → `profiles.id`, NOT NULL ON DELETE CASCADE | Właściciel (fizjoterapeuta) rekordu pacjenta.
| `first_name` | `text` | NOT NULL | Imię pacjenta.
| `last_name` | `text` | NOT NULL | Nazwisko pacjenta.
| `date_of_birth` | `date` | NULL | Data urodzenia pacjenta.
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Data utworzenia rekordu.
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Aktualizowana przez trigger `moddatetime` po każdej zmianie.

### 1.3 `visits`
| Kolumna | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, NOT NULL DEFAULT `gen_random_uuid()` | Identyfikator wizyty.
| `patient_id` | `uuid` | FK → `patients.id`, NOT NULL ON DELETE CASCADE | Pacjent, którego dotyczy wizyta.
| `visit_date` | `timestamptz` | NOT NULL | Data i godzina wizyty.
| `interview` | `text` | NULL | Notatki z wywiadu subjektivnego.
| `description` | `text` | NULL | Opis przebiegu wizyty (notatki obiektywne).
| `recommendations` | `text` | NULL | Zatwierdzone zalecenia dla pacjenta.
| `recommendations_generated_by_ai` | `boolean` | NOT NULL DEFAULT `false` | Flaga informująca, że zalecenia powstały przy udziale AI.
| `recommendations_generated_at` | `timestamptz` | NULL | Czas ostatniego wygenerowania zaleceń przez AI.
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Data utworzenia wizyty.
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Aktualizowana przez trigger `moddatetime` po każdej zmianie.

### 1.4 `visit_ai_generations`
| Kolumna | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, NOT NULL DEFAULT `gen_random_uuid()` | Identyfikator logu generacji AI.
| `visit_id` | `uuid` | FK → `visits.id`, NOT NULL ON DELETE CASCADE | Wizyta, dla której wygenerowano zalecenia.
| `therapist_id` | `uuid` | FK → `profiles.id`, NOT NULL ON DELETE CASCADE | Właściciel danych, powielony dla łatwiejszej RLS.
| `prompt` | `text` | NOT NULL | Wejściowy kontekst przekazany do modelu AI.
| `ai_response` | `text` | NOT NULL | Surowa odpowiedź modelu AI przed edycją.
| `model_used` | `text` | NOT NULL | Identyfikator modelu z OpenRouter.
| `temperature` | `numeric(3,2)` | NULL | Parametr kreatywności (gdy dostępny).
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Znacznik czasu generacji.

## 2. Relacje między tabelami
- `auth.users (1) ↔ (1) profiles`: jeden użytkownik Supabase ma dokładnie jeden profil terapeuty.
- `profiles (1) ↔ (n) patients`: terapeuta posiada wielu pacjentów, każdy pacjent należy do jednego terapeuty.
- `patients (1) ↔ (n) visits`: pacjent ma wiele wizyt, każda wizyta należy do jednego pacjenta.
- `profiles (1) ↔ (n) visit_ai_generations`: logi generacji są własnością terapeuty.
- `visits (1) ↔ (n) visit_ai_generations`: każda generacja AI jest związana z jedną wizytą.

## 3. Indeksy
- `CREATE INDEX idx_patients_therapist ON patients(therapist_id);` – przyspiesza filtrowanie pacjentów po właścicielu.
- `CREATE UNIQUE INDEX uq_patients_name_dob ON patients (therapist_id, lower(first_name), lower(last_name), date_of_birth);` – minimalizuje duplikaty w obrębie terapeuty (zezwala na wiele wpisów z `date_of_birth IS NULL`).
- `CREATE INDEX idx_visits_patient_date ON visits(patient_id, visit_date DESC);` – zapewnia sortowanie historii wizyt w kolejności malejącej.
- `CREATE INDEX idx_visits_recommendations_ai ON visits(recommendations_generated_by_ai) WHERE recommendations_generated_by_ai IS TRUE;` – pozwala szybko uzyskać statystyki AI.
- `CREATE INDEX idx_visit_ai_generations_visit ON visit_ai_generations(visit_id);` – szybki dostęp do historii generacji dla wizyty.
- `CREATE INDEX idx_visit_ai_generations_therapist ON visit_ai_generations(therapist_id);` – wspiera RLS i agregacje po terapeucie.

## 4. Zasady PostgreSQL i bezpieczeństwo
- Wymagane rozszerzenia: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`, `CREATE EXTENSION IF NOT EXISTS moddatetime;`.
- Trigger automatycznie tworzący profil: funkcja `handle_new_user()` (SECURITY DEFINER) wywoływana przez trigger `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();` – wstawia rekord do `profiles`.
- Trigger aktualizujący `updated_at`: `CREATE TRIGGER set_timestamp BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);` dla `profiles`, `patients`, `visits`.
- Trigger synchronizujący właściciela logu AI: `CREATE TRIGGER visit_ai_generations_set_owner BEFORE INSERT ON visit_ai_generations FOR EACH ROW EXECUTE FUNCTION set_therapist_from_visit();`, który kopiuje `therapist_id` z wizyty.
- Włączenie RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` dla `profiles`, `patients`, `visits`, `visit_ai_generations`.
- Polityki RLS:
  - `profiles`:
    - `CREATE POLICY profiles_self_select ON profiles FOR SELECT USING (id = auth.uid());`
    - `CREATE POLICY profiles_self_update ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());`
  - `patients`:
    - `CREATE POLICY patients_owner_crud ON patients FOR ALL USING (therapist_id = auth.uid()) WITH CHECK (therapist_id = auth.uid());`
  - `visits`:
    - `CREATE POLICY visits_owner_select ON visits FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = visits.patient_id AND p.therapist_id = auth.uid()));`
    - `CREATE POLICY visits_owner_write ON visits FOR INSERT, UPDATE, DELETE USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = visits.patient_id AND p.therapist_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.id = visits.patient_id AND p.therapist_id = auth.uid()));`
  - `visit_ai_generations`:
    - `CREATE POLICY ai_logs_owner ON visit_ai_generations FOR ALL USING (therapist_id = auth.uid()) WITH CHECK (therapist_id = auth.uid());`
- Domyślna polityka blokująca: `ALTER TABLE <table> FORCE ROW LEVEL SECURITY;` oraz brak polityki PUBLIC zapewnia brak dostępu dla niezalogowanych użytkowników.

## 5. Dodatkowe uwagi projektowe
- Kolumny tekstowe pozostają elastyczne, aby wspierać różne formaty zaleceń; w dalszym etapie można rozważyć przejście na strukturę JSONB dla modułu AI.
- Flagi i znaczniki czasu powiązane z AI umożliwiają raportowanie skuteczności modułu (metryki z PRD).
- Supabase udostępnia `auth.uid()` w politykach RLS oraz obsługuje rozszerzenia, dlatego projekt jest w pełni kompatybilny ze stackiem technologicznym.
- Migracje powinny ustawiać strefę czasową na UTC (`SET timezone TO 'UTC';`) oraz zapewniać spójne wartości domyślne dla `timestamptz`.
