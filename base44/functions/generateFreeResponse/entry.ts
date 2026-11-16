import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { courseCodeOf, courseScope } from '../../shared/courseNames.ts';
import { SELF_DOUBT } from '../../shared/questionChecks.ts';
import { FREE_RESPONSE_SCHEMA, buildPrompt } from './prompt.ts';
import { checkFreeResponse } from './check.ts';

const TARGET_PER_TOPIC = 2;
const TOPICS_PER_CALL = 4;
const MAX_TOPICS_PER_RUN = 8;

// A stray literal \n (not a LaTeX command like \neq) becomes a real line break.
const text = (value) => String(value || '').replace(/\\n(?![a-z])/g, '\n').trim();

// Each part label opens its own paragraph, whether or not the writer put it on a new line.
const questionText = (value) => text(value).replace(/(?<![Pp]arts?)\s+(?=\([a-d]\)\s+[A-Z])/g, '\n\n');
const answerText = (value) => questionText(value).replace(/\s+(?=Part \([a-d]\):)/g, '\n\n');

// Drafts the written questions for a few topics, then keeps only those that pass an independent audit.
async function writeChunk(base44, topics) {
  const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: buildPrompt(topics),
    response_json_schema: FREE_RESPONSE_SCHEMA,
  });

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const taken = new Map();
  const drafts = [];
  for (const q of reply?.questions || []) {
    const topic = topicById.get(q.topic_id);
    const rubric = (q.rubric || []).map(text).filter(Boolean);
    const used = topic ? taken.get(topic.id) || 0 : 0;
    if (!topic || used >= topic.needed) continue;
    if (!text(q.question_text) || !text(q.model_answer) || rubric.length < 3 || rubric.length > 6) continue;
    if (SELF_DOUBT.test(q.model_answer)) continue;
    taken.set(topic.id, used + 1);
    drafts.push({
      course_id: topic.course_id,
      course_code: courseCodeOf(topic),
      unit_id: topic.unit_id,
      topic_id: topic.id,
      type: 'free_response',
      difficulty: q.difficulty === 'hard' ? 'hard' : 'medium',
      question_text: questionText(q.question_text),
      rubric,
      correct_answer: answerText(q.model_answer),
      is_active: true,
      verified: true,
    });
  }

  const passed = await checkFreeResponse(base44, drafts);
  return { drafted: drafts.length, records: drafts.filter((_, index) => passed[index]) };
}

// Writes AP-style free-response questions, with a scoring guide and model answer, for topics that have fewer than two.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 4), MAX_TOPICS_PER_RUN);
    const inScope = courseScope(body);
    const svc = base44.asServiceRole.entities;

    const [units, topics, existing] = await Promise.all([
      svc.Unit.list('created_date', 500),
      svc.Topic.list('created_date', 1000),
      svc.Question.filter({ type: 'free_response', is_active: { $ne: false } }, 'created_date', 5000),
    ]);
    const unitTitle = new Map(units.map((unit) => [unit.id, unit.title]));
    const countByTopic = new Map();
    for (const q of existing) countByTopic.set(q.topic_id, (countByTopic.get(q.topic_id) || 0) + 1);

    const pendingAll = topics.filter((topic) => inScope(topic) && (countByTopic.get(topic.id) || 0) < TARGET_PER_TOPIC);
    if (pendingAll.length === 0) return Response.json({ generated: 0, remaining_topics: 0 });

    // A random draw, so a topic whose drafts keep failing the audit cannot hold up the others.
    const pending = [...pendingAll]
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((topic) => ({
        ...topic,
        unit_title: unitTitle.get(topic.unit_id) || '',
        needed: TARGET_PER_TOPIC - (countByTopic.get(topic.id) || 0),
      }));

    const chunks = [];
    for (let i = 0; i < pending.length; i += TOPICS_PER_CALL) chunks.push(pending.slice(i, i + TOPICS_PER_CALL));
    const written = await Promise.allSettled(chunks.map((chunk) => writeChunk(base44, chunk)));
    if (written.every((result) => result.status === 'rejected')) throw written[0].reason;

    const done = written.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const records = done.flatMap((chunk) => chunk.records);
    if (records.length > 0) await svc.Question.bulkCreate(records);

    return Response.json({
      generated: records.length,
      rejected: done.reduce((sum, chunk) => sum + chunk.drafted, 0) - records.length,
      remaining_topics: pendingAll.length,
    });
  } catch (error) {
    console.error('generateFreeResponse error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}