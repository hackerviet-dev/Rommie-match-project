import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const require = createRequire(process.cwd() + '/frontend/web-app/rommie-match/package.json');
await require('esbuild').build({
  entryPoints: {
    dates: 'frontend/web-app/rommie-match/src/utils/date-rules.ts',
    onboarding: 'frontend/web-app/rommie-match/src/features/onboarding/schemas/onboarding-schema.ts',
    settings: 'frontend/web-app/rommie-match/src/features/settings/schemas/settings-profile-schema.ts',
  }, bundle: true, platform: 'node', format: 'cjs', outdir: 'tmp/date-rules', outExtension: { '.js': '.cjs' },
});
const { vietnamToday, isValidDate } = require(process.cwd() + '/tmp/date-rules/dates.cjs');
const { onboardingDefaults, validateOnboardingStep } = require(process.cwd() + '/tmp/date-rules/onboarding.cjs');
const { settingsProfileSchema } = require(process.cwd() + '/tmp/date-rules/settings.cjs');
assert.equal(vietnamToday(new Date('2026-10-02T16:59:59Z')), '2026-10-02');
assert.equal(vietnamToday(new Date('2026-10-02T17:00:00Z')), '2026-10-03');
for (const invalid of ['2026-02-29', '2026-02-30', '2026-13-01', '0000-01-01', '03/10/2026', '']) assert.equal(isValidDate(invalid), false);
assert.equal(isValidDate('2028-02-29'), true);
const today = vietnamToday();
const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
for (const date of [today, tomorrow]) {
  assert.deepEqual(validateOnboardingStep(4, { ...onboardingDefaults, hasRoom: 'no', distance: '2–5 km', roomType: 'Phòng riêng', moveInDate: date }), {});
}
assert.match(validateOnboardingStep(4, { ...onboardingDefaults, hasRoom: 'no', moveInDate: yesterday }).moveInDate, /hôm nay/);
assert.match(validateOnboardingStep(4, { ...onboardingDefaults, hasRoom: 'yes', moveIn: yesterday }).moveIn, /hôm nay/);
const profile = { displayName: 'Date Test', city: 'TP.HCM', gender: 'male', occupation: '', district: '', bio: '' };
assert.equal(settingsProfileSchema.safeParse({ ...profile, birthDate: today }).success, true);
assert.equal(settingsProfileSchema.safeParse({ ...profile, birthDate: tomorrow }).success, false);
console.log('PASS: Vietnam midnight boundary, leap/invalid dates, today/future/past move-in and future birth date');
