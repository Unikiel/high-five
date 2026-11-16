import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { courseCodeOf, courseScope } from '../../shared/courseNames.ts';
import { LETTERS, SELF_DOUBT, shuffleOptions, verifyQuestions } from '../../shared/questionChecks.ts';
import { QUESTIONS_SCHEMA, buildPrompt } from './prompt.ts';

const AUTOMATION_TOKEN = 'hf-qbank-v1-2p8d4n7wk3';
const TARGET_PER_TOPIC = 9;
const TOPICS_PER_CALL = 4;
const MAX_TOPICS_PER_RUN = 8;
const PAGE = 5000;
const MAX_PAGES = 100;
const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Stray literal \n (not a LaTeX command like \neq) becomes a space.
const clean = (s) => String(s || '').replace(/\\n(?![a-z])/g, ' ').trim();

// Questions hidden by the answer check do not count, so their topic gets replacements.
async function listActiveQuestions(api) {
  const out = [];
  for (let request = 0; request < MAX_PAGES; request++) {
    const page = await api.list('created_date', PAGE, out.length);
    if (page.length === 0) break;
    out.push(...page);
  }
  return out.filter((q) => q.is_active !== false);
}

async function writeQuestions(base44, topics) {
  const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: buildPrompt(topics),
    response_json_schema: QUESTIONS_SCHEMA,
  });
  return generated?.questions || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (body.token !== AUTOMATION_TOKEN) {
      const user = await base44.auth.me().catch(() => null);
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const limit = Math.min(Number(body.limit || 3), MAX_TOPICS_PER_RUN);
    const target = Number(body.target || TARGET_PER_TOPIC);
    const inScope = courseScope(body);
    const svc = base44.asServiceRole.entities;

    const units = await svc.Unit.list('created_date', 500);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const allTopics = await svc.Topic.list('created_date', 1000);
    const activeQuestions = await listActiveQuestions(svc.Question);

    const countByTopic = new Map();
    for (const q of activeQuestions) {
      if (q.topic_id) countByTopic.set(q.topic_id, (countByTopic.get(q.topic_id) || 0) + 1);
    }

    const pendingAll = allTopics.filter((topic) =>
      inScope(topic) && (countByTopic.get(topic.id) || 0) < target
    );
    const pending = pendingAll
      .sort((a, b) => `${a.course_id}-${String(a.topic_number).padStart(8, '0')}`.localeCompare(`${b.course_id}-${String(b.topic_number).padStart(8, '0')}`))
      .slice(0, limit)
      .map((topic) => ({
        ...topic,
        unit_title: unitById.get(topic.unit_id)?.title || '',
        needed: target - (countByTopic.get(topic.id) || 0)
      }));

    if (pending.length === 0) {
      return Response.json({ generated: 0, remaining: 0 });
    }

    const chunks = [];
    for (let i = 0; i < pending.length; i += TOPICS_PER_CALL) chunks.push(pending.slice(i, i + TOPICS_PER_CALL));
    const written = await Promise.allSettled(chunks.map((chunk) => writeQuestions(base44, chunk)));
    const failure = written.find((result) => result.status === 'rejected');
    if (failure && written.every((result) => result.status === 'rejected')) throw failure.reason;

    const topicById = new Map(pending.map((t) => [t.id, t]));
    const drafts = written
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .filter((q) =>
        topicById.has(q.topic_id) &&
        q.options?.length === 4 &&
        new Set(q.options.map(clean)).size === 4 &&
        LETTERS.includes(q.correct_answer) &&
        !SELF_DOUBT.test(q.explanation || '')
      )
      .map((q) => {
        const topic = topicById.get(q.topic_id);
        return shuffleOptions({
          course_id: topic.course_id,
          course_code: courseCodeOf(topic),
          unit_id: topic.unit_id,
          topic_id: topic.id,
          type: 'multiple_choice',
          difficulty: DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'medium',
          question_text: clean(q.question_text),
          options: q.options.map(clean),
          correct_answer: q.correct_answer,
          explanation: clean(q.explanation),
          is_active: true
        });
      });

    // Only questions whose key survives an independent re-solve are saved; the rest are rewritten on a later run.
    const verdicts = await verifyQuestions(base44, drafts);
    const records = drafts
      .filter((_, index) => verdicts[index]?.ok)
      .map((record) => ({ ...record, verified: true }));

    if (records.length > 0) {
      await svc.Question.bulkCreate(records);
    }

    const createdByTopic = new Map();
    for (const r of records) createdByTopic.set(r.topic_id, (createdByTopic.get(r.topic_id) || 0) + 1);

    let topicsDone = 0;
    for (const topic of pending) {
      const total = (countByTopic.get(topic.id) || 0) + (createdByTopic.get(topic.id) || 0);
      if (total >= target) {
        topicsDone++;
        if (!topic.questions_generated) {
          await svc.Topic.update(topic.id, { questions_generated: true });
        }
      }
    }

    return Response.json({
      generated: records.length,
      rejected: drafts.length - records.length,
      topics_done: topicsDone,
      remaining: Math.max(pendingAll.length - topicsDone, 0),
      active_questions: activeQuestions.length + records.length
    });
  } catch (error) {
    console.error('generateQuestionBank error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});