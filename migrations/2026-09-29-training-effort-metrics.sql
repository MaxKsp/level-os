-- Additive migration: registrar percepção de esforço por série executada.
-- Aplicar APENAS uma vez, em MySQL de staging restaurado e testado antes da produção.
-- A API permanece compatível com o schema anterior quando rpe/rir não forem enviados.
ALTER TABLE training_session_entries
  ADD COLUMN rpe DECIMAL(3,1) NULL AFTER weighted_kg,
  ADD COLUMN rir SMALLINT UNSIGNED NULL AFTER rpe;
