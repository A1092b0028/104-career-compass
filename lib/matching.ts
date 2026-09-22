export type Profile = { skills: string[]; locations: string[]; titles: string[]; exclude: string[]; years: number | null; min_salary: number; resume_text: string };
export type Job = { id: string; title: string; company: string; location: string; description: string; url: string; salary_text: string; salary_min: number | null; salary_max: number | null; years_required: number | null; publish_time: string };
export type Match = { score: number; coverage: number; reasons: string[]; excluded: string[]; breakdown: Record<string, number> };
export const emptyProfile: Profile = { skills: [], locations: ['台北市', '新北市'], titles: [], exclude: [], years: null, min_salary: 0, resume_text: '' };
export const norm = (s: string) => s.normalize('NFKC').toLowerCase().replaceAll('臺', '台').trim();
export function contains(text: string, term: string) {
  term = norm(term);
  return /[a-z]/.test(term) ? new RegExp('(?<![a-z0-9])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])').test(norm(text)) : norm(text).includes(term);
}
function tokens(s: string) {
  const out = new Map<string, number>(); const add = (v: string) => out.set(v, (out.get(v) || 0) + 1); const n = norm(s);
  for (const v of n.match(/[a-z0-9+#.]+/g) || []) add(v);
  for (const run of n.match(/[\u4e00-\u9fff]+/g) || []) for (let i = 0; i < Math.max(1, run.length - 1); i++) add(run.slice(i, i + 2));
  return out;
}
export function similarity(a: string, b: string) {
  const x = tokens(a), y = tokens(b), denom = Math.sqrt([...x.values()].reduce((s, v) => s + v*v, 0) * [...y.values()].reduce((s, v) => s + v*v, 0));
  return denom ? [...x].reduce((s, [k, v]) => s + v*(y.get(k) || 0), 0) / denom : 0;
}
export function score(j: Job, p: Profile): Match {
  const text = j.title + ' ' + j.description, reasons: string[] = [], excluded: string[] = [];
  if (p.locations.length && !p.locations.some(x => norm(j.location).includes(norm(x)))) excluded.push('地區不符合或未提供');
  if (p.exclude.some(x => contains(text, x))) excluded.push('包含排除關鍵字');
  if (p.min_salary && j.salary_max !== null && j.salary_max < p.min_salary) excluded.push('薪資上限低於期望');
  const hits = p.skills.filter(s => contains(text, s)), ts = Math.max(0, ...p.titles.map(t => similarity(t, j.title)));
  if (p.skills.length && !hits.length && p.titles.length && ts < .2) excluded.push('技能關鍵字匹配不足');
  if (p.titles.length && ts < .1) excluded.push('職稱匹配度過低');
  const parts: Record<string, [number, number]> = {};
  if (p.skills.length) { parts['技能'] = [35*hits.length/p.skills.length, 35]; reasons.push('技能命中：' + (hits.join('、') || '無')); }
  if (p.titles.length) parts['職稱'] = [25*ts, 25];
  if (p.resume_text) parts['描述相似度'] = [10*similarity(p.resume_text, text), 10];
  if (p.years !== null && j.years_required !== null) { parts['年資'] = [p.years >= j.years_required ? 15 : 0, 15]; reasons.push(p.years >= j.years_required ? '年資符合' : '年資未達要求'); } else reasons.push('年資待確認');
  if (p.min_salary && j.salary_min !== null) { parts['薪資'] = [j.salary_min >= p.min_salary ? 15 : 7.5, 15]; reasons.push(j.salary_min >= p.min_salary ? '薪資下限達標' : '薪資需洽談'); } else if (p.min_salary) reasons.push('薪資待確認');
  const weight = Object.values(parts).reduce((s, v) => s + v[1], 0);
  return { score: weight ? Math.round(1000*Object.values(parts).reduce((s, v) => s+v[0], 0)/weight)/10 : 0, coverage: weight, reasons, excluded, breakdown: Object.fromEntries(Object.entries(parts).map(([k,v]) => [k, Math.round(v[0]*100)/100])) };
}
export function rank(items: { job: Job; result: Match }[]) {
  return [...items].sort((a,b) => b.result.score-a.result.score || b.job.publish_time.localeCompare(a.job.publish_time) || a.job.id.localeCompare(b.job.id));
}
