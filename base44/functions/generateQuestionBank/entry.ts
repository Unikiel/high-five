import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AUTOMATION_TOKEN = 'hf-qbank-v1-2p8d4n7wk3';
const TARGET_PER_TOPIC = 9;

const COURSE_NAMES = {
  AP_CALC_AB: 'AP Calculus AB',
  AP_CALC_BC: 'AP Calculus BC',
  AP_PHYSICS_1: 'AP Physics 1',
  AP_PHYSICS_2: 'AP Physics 2',
  AP_PHYSICS_CM: 'AP Physics C: Mechanics',
  AP_PHYSICS_CE: 'AP Physics C: Electricity and Magnetism',
  AP_CSP: 'AP Computer Science Principles',
  AP_CSA: 'AP Computer Science A',
  AP_STATS: 'AP Statistics',
  AP_PRECALC: 'AP Precalculus'
};

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

    const limit = Math.min(Number(body.limit || 3), 4);
    const target = Number(body.target || TARGET_PER_TOPIC);
    const courseId = body.course_id || null;

    const units = await base44.asServiceRole.entities.Unit.list('created_date', 500);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const allTopics = await base44.asServiceRole.entities.Topic.list('created_date', 1000);
    const allQuestions = await base44.asServiceRole.entities.Question.list('created_date', 10000);

    const countByTopic = new Map();
    for (const q of allQuestions) {
      if (q.topic_id) countByTopic.set(q.topic_id, (countByTopic.get(q.topic_id) || 0) + 1);
    }

    const pendingAll = allTopics.filter((topic) =>
      (!courseId || topic.course_id === courseId) && (countByTopic.get(topic.id) || 0) < target
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

    const topicList = pending
      .map((t) => `topic_id=${t.id} | needed=${t.needed} questions | ${COURSE_NAMES[t.course_id] || t.course_id} | Unit: ${t.unit_title} | Topic ${t.topic_number}: ${t.title}`)
      .join('\n');

    const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are an AP exam item writer who follows the official College Board Course and Exam Description (CED) and the style of released AP multiple-choice questions.

For EACH topic below, write exactly the "needed" number of ORIGINAL multiple-choice questions in authentic AP exam style, spread evenly across easy, medium, and hard difficulties. Each question must directly assess that specific CED topic's learning objective — not general subject knowledge. Vary the scenarios, numbers, and representations (algebraic, graphical, tabular, verbal) so no two questions feel alike.

TOPICS:
${topicList}

Requirements per question:
- topic_id: exactly as given
- difficulty: "easy", "medium", or "hard"
- question_text: a complete AP-style stem with concrete numbers, functions, data, scenarios, or code. Embed ALL math as inline LaTeX wrapped in single dollar signs, e.g. $\\int_0^2 x^2\\,dx$. Never use $$ display math, never leave an unmatched $, and never write a literal backslash-n for a line break — use a real line break only for code. For AP CSA include real Java code in the stem when appropriate (plain text, indented).
- options: exactly 4 answer choices (values/expressions only, no "A)" prefixes). Distractors must reflect realistic student errors (sign errors, off-by-one, wrong rule, condition ignored). Math in options also uses $...$ LaTeX.
- correct_answer: the letter "A", "B", "C", or "D" matching the position of the correct option. Randomize which position is correct.
- explanation: 2-4 sentences showing the correct solution work with $...$ LaTeX and why the answer is right.

Return JSON only.`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic_id: { type: 'string' },
                difficulty: { type: 'string' },
                question_text: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correct_answer: { type: 'string' },
                explanation: { type: 'string' }
              },
              required: ['topic_id', 'difficulty', 'question_text', 'options', 'correct_answer', 'explanation']
            }
          }
        },
        required: ['questions']
      }
    });

    // Sanitize: convert stray literal \n (not a LaTeX command like \neq) into spaces
    const clean = (s) => String(s || '').replace(/\\n(?![a-z])/g, ' ').trim();

    const topicById = new Map(pending.map((t) => [t.id, t]));
    const records = (generated.questions || [])
      .filter((q) => topicById.has(q.topic_id) && q.options?.length === 4 && ['A', 'B', 'C', 'D'].includes(q.correct_answer))
      .map((q) => {
        const topic = topicById.get(q.topic_id);
        return {
          course_id: topic.course_id,
          unit_id: topic.unit_id,
          topic_id: topic.id,
          type: 'multiple_choice',
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          question_text: clean(q.question_text),
          options: q.options.map(clean),
          correct_answer: q.correct_answer,
          explanation: clean(q.explanation),
          is_active: true
        };
      });

    if (records.length > 0) {
      await base44.asServiceRole.entities.Question.bulkCreate(records);
    }

    const createdByTopic = new Map();
    for (const r of records) createdByTopic.set(r.topic_id, (createdByTopic.get(r.topic_id) || 0) + 1);

    let topicsDone = 0;
    for (const topic of pending) {
      const total = (countByTopic.get(topic.id) || 0) + (createdByTopic.get(topic.id) || 0);
      if (total >= target) {
        topicsDone++;
        if (!topic.questions_generated) {
          await base44.asServiceRole.entities.Topic.update(topic.id, { questions_generated: true });
        }
      }
    }

    return Response.json({ generated: records.length, topics_done: topicsDone, remaining: Math.max(pendingAll.length - topicsDone, 0) });
  } catch (error) {
    console.error('generateQuestionBank error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});