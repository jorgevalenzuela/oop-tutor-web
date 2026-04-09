import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { MasteryConfig } from '../types';

export function listConfigs(): MasteryConfig[] {
  return db.prepare('SELECT * FROM mastery_configs ORDER BY concept ASC').all() as MasteryConfig[];
}

export function getConfig(concept: string): MasteryConfig | null {
  return db.prepare('SELECT * FROM mastery_configs WHERE concept = ?').get(concept) as MasteryConfig | null;
}

export function upsertConfig(
  concept: string,
  scoreThreshold: number,
  consecutiveRequired: number,
  requiredForCert: boolean,
  createdBy: string,
  minBloomLevel = 3
): MasteryConfig {
  const existing = getConfig(concept);

  if (existing) {
    db.prepare(`
      UPDATE mastery_configs
      SET score_threshold = ?, consecutive_required = ?, required_for_cert = ?, min_bloom_level_for_mastery = ?, updated_at = datetime('now')
      WHERE concept = ?
    `).run(scoreThreshold, consecutiveRequired, requiredForCert ? 1 : 0, minBloomLevel, concept);
  } else {
    db.prepare(`
      INSERT INTO mastery_configs (id, concept, score_threshold, consecutive_required, required_for_cert, min_bloom_level_for_mastery, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), concept, scoreThreshold, consecutiveRequired, requiredForCert ? 1 : 0, minBloomLevel, createdBy);
  }

  return getConfig(concept) as MasteryConfig;
}

export function deleteConfig(concept: string): boolean {
  const result = db.prepare('DELETE FROM mastery_configs WHERE concept = ?').run(concept);
  return result.changes > 0;
}
