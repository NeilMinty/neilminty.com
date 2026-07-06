import { describe, it, expect } from 'vitest';
import { classifyDelivery, parseMetaExport, analyseCreatives } from './metaCreativeLogic';
import type { RawAdRow } from './metaCreativeTypes';

// ─── classifyDelivery ─────────────────────────────────────────────────────────

describe('classifyDelivery', () => {
  it('"Active" → stable', () => {
    expect(classifyDelivery('Active')).toBe('stable');
  });

  it('"Learning" → learning', () => {
    expect(classifyDelivery('Learning')).toBe('learning');
  });

  it('"Learning Limited" → learning_limited', () => {
    expect(classifyDelivery('Learning Limited')).toBe('learning_limited');
  });

  it('"Paused" → other', () => {
    expect(classifyDelivery('Paused')).toBe('other');
  });

  it('empty string → other', () => {
    expect(classifyDelivery('')).toBe('other');
  });

  it('is case-insensitive — "ACTIVE" → stable', () => {
    expect(classifyDelivery('ACTIVE')).toBe('stable');
  });

  it('is case-insensitive — "LEARNING LIMITED" → learning_limited', () => {
    expect(classifyDelivery('LEARNING LIMITED')).toBe('learning_limited');
  });

  it('is case-insensitive — "learning" lowercase → learning', () => {
    expect(classifyDelivery('learning')).toBe('learning');
  });
});

// ─── parseMetaExport ─────────────────────────────────────────────────────────

describe('parseMetaExport', () => {
  it('maps standard Meta export headers to RawAdRow[]', () => {
    const raw = [
      { 'Ad name': 'Ad A', 'Amount spent': '100', Delivery: 'Active' },
      { 'Ad name': 'Ad B', 'Amount spent': '50',  Delivery: 'Learning' },
    ];
    const result = parseMetaExport(raw);
    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ adName: 'Ad A', spend: 100, delivery: 'Active' });
    expect(result.rows[1]).toMatchObject({ adName: 'Ad B', spend: 50,  delivery: 'Learning' });
  });

  it('strips currency symbols from spend', () => {
    const raw = [{ 'Ad name': 'Ad A', 'Amount spent': '£1,250.00', Delivery: 'Active' }];
    const result = parseMetaExport(raw);
    expect(result.error).toBeNull();
    expect(result.rows[0].spend).toBeCloseTo(1250);
  });

  it('filters out rows with zero spend', () => {
    const raw = [
      { 'Ad name': 'Ad A', 'Amount spent': '0',  Delivery: 'Active' },
      { 'Ad name': 'Ad B', 'Amount spent': '80', Delivery: 'Active' },
    ];
    const result = parseMetaExport(raw);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].adName).toBe('Ad B');
  });

  it('returns error when Ad Name column is missing', () => {
    const raw = [{ 'Amount spent': '100', Delivery: 'Active' }];
    const result = parseMetaExport(raw);
    expect(result.error).not.toBeNull();
    expect(result.rows).toHaveLength(0);
  });

  it('returns error when Spend column is missing', () => {
    const raw = [{ 'Ad name': 'Ad A', Delivery: 'Active' }];
    const result = parseMetaExport(raw);
    expect(result.error).not.toBeNull();
    expect(result.rows).toHaveLength(0);
  });

  it('returns warning (not error) when Delivery column is missing', () => {
    const raw = [{ 'Ad name': 'Ad A', 'Amount spent': '100' }];
    const result = parseMetaExport(raw);
    expect(result.error).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].delivery).toBe('');
  });
});

// ─── analyseCreatives ────────────────────────────────────────────────────────

// Four ads: A=stable £500, B=learning £300, C=learning_limited £200, D=other £100
// total = £1100
// spendShares: A=45.45%, B=27.27%, C=18.18%, D=9.09%
// estimatedPremium = (300 + 200) × 0.40 = £200
// activeAds = 3 (A, B, C — D is other)

const BASE_ROWS: RawAdRow[] = [
  { adName: 'Ad A', spend: 500, delivery: 'Active' },
  { adName: 'Ad B', spend: 300, delivery: 'Learning' },
  { adName: 'Ad C', spend: 200, delivery: 'Learning Limited' },
  { adName: 'Ad D', spend: 100, delivery: 'Paused' },
];

describe('analyseCreatives', () => {
  it('sorts ads by spend descending', () => {
    const r = analyseCreatives(BASE_ROWS);
    expect(r.ads[0].adName).toBe('Ad A');
    expect(r.ads[1].adName).toBe('Ad B');
    expect(r.ads[2].adName).toBe('Ad C');
    expect(r.ads[3].adName).toBe('Ad D');
  });

  it('spendShare values sum to approximately 100', () => {
    const r = analyseCreatives(BASE_ROWS);
    const sum = r.ads.reduce((s, a) => s + a.spendShare, 0);
    expect(sum).toBeCloseTo(100);
  });

  it('estimatedPremium equals 40% of learning and learningLimited spend combined', () => {
    const r = analyseCreatives(BASE_ROWS);
    // (300 + 200) × 0.40 = 200
    expect(r.summary.estimatedPremium).toBeCloseTo(200);
  });

  it('activeAds excludes other bucket', () => {
    const r = analyseCreatives(BASE_ROWS);
    // A (stable), B (learning), C (learning_limited) = 3; D (other) excluded
    expect(r.activeAds).toBe(3);
    expect(r.totalAds).toBe(4);
  });
});
