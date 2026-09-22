import { z } from 'zod';
const words = z.array(z.string().trim().min(1).max(100)).max(50).transform(a => [...new Set(a)]);
export const profileSchema = z.object({ skills: words, locations: words, titles: words, exclude: words, years: z.number().finite().min(0).max(100).nullable(), min_salary: z.number().finite().min(0).max(100000000), resume_text: z.string().max(100000) }).strict();
export const jobSchema = z.object({
  title: z.string().trim().min(1).max(300), company: z.string().trim().min(1).max(300), location: z.string().max(300), description: z.string().max(6000), url: z.string().regex(/^https:\/\/www\.104\.com\.tw\/job\/[a-z0-9]+$/i),
  salary_text: z.string().max(200), salary_min: z.number().finite().min(0).max(100000000).nullable(), salary_max: z.number().finite().min(0).max(100000000).nullable(), years_required: z.number().finite().min(0).max(100).nullable(),
  publish_time: z.string().refine(v => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v && v <= new Date().toISOString().slice(0,10)), '發布日期無效'),
}).strict().refine(j => j.salary_min === null || j.salary_max === null || j.salary_min <= j.salary_max, '薪資範圍無效').transform(j => ({ ...j, id: j.url.split('/').pop()!.toLowerCase() }));
export const finishSchema = z.object({ jobs: z.array(jobSchema).max(50), raw: z.number().int().min(0).max(10000), emptyConfirmed: z.boolean().optional() }).strict();
export const states = ['未讀取','已讀','已投遞','篩除'] as const;
