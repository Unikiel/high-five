import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { COURSE_NAMES, COURSE_SUBJECT, courseCodeOf, courseScope } from '../../shared/courseNames.ts';

const AUTOMATION_TOKEN = 'hf-qbank-v1-2p8d4n7wk3';
const TARGET_PER_TOPIC = 9;

const MONEY_RULE = `- Money: write dollar amounts as plain text with the dollar sign directly before the number (for example $5 or $2,000). Never put a money amount inside LaTeX math; in a formula that involves money, write the number without the dollar sign.`;

const QUESTION_NOTES = {
  economics: `
SUBJECT NOTES (economics topics):
- There are no images. When a question depends on a graph or table, describe it in words inside the stem: axis labels, curves, labeled points and values. Present table data as short plain-text lines, one row per line (real line breaks are allowed for this).
- Mix calculation items with model-reasoning items (which curve shifts, what happens to equilibrium price, quantity, output, or the interest rate).
- Distractors reflect classic errors: a shift confused with a movement along a curve, nominal confused with real, marginal confused with average or total, the short run confused with the long run.
${MONEY_RULE}
`,
  psychology: `
SUBJECT NOTES (psychology topics):
- Most items are scenario-based application: a concrete situation, then the concept that best explains it. Include some research-methods and data-interpretation items (design, variables, sampling, ethics, what a result does or does not show).
- Use the exact terminology of the current AP Psychology CED (2024-25 framework). Distractors are the most closely related, easily confused terms.
- Do not use LaTeX for ordinary text.
${MONEY_RULE}
`,
  history: `
SUBJECT NOTES (U.S. history topics):
- Every question is stimulus-based, as on the real exam. Write the stimulus as its own first paragraph of two to four sentences, then a blank line, then the question.
- The stimulus must be one of: (a) a short, accurate quotation from a specific real document that you name with its author, title and year (for example the Declaration of Independence, Federalist No. 10, the Monroe Doctrine, the Gettysburg Address); (b) a historian's interpretation written as a summary that begins "A historian argues that ..."; or (c) a plain description of a real map, political cartoon, photograph or data set, with its date. Never put invented words in quotation marks, and never attribute a made-up quotation to a person, an official, or an unnamed letter or diary.
- The question assesses historical reasoning with specific evidence from the period: causation, comparison, continuity and change, contextualization, or the source's point of view, purpose, and audience. The answer must not be findable by reading the stimulus alone.
- Distractors are plausible developments from the wrong period, the wrong region, or the opposite cause or effect.
- Do not use LaTeX.
${MONEY_RULE}
`,
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
    const inScope = courseScope(body);

    const units = await base44.asServiceRole.entities.Unit.list('created_date', 500);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const allTopics = await base44.asServiceRole.entities.Topic.list('created_date', 1000);
    const allQuestions = await base44.asServiceRole.entities.Question.list('created_date', 10000);

    const countByTopic = new Map();
    for (const q of allQuestions) {
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

    const topicList = pending
      .map((t) => `topic_id=${t.id} | needed=${t.needed} questions | ${COURSE_NAMES[courseCodeOf(t)] || courseCodeOf(t)} | Unit: ${t.unit_title} | Topic ${t.topic_number}: ${t.title}`)
      .join('\n');

    const subjectNotes = [...new Set(pending.map((t) => COURSE_SUBJECT[courseCodeOf(t)]))]
      .map((subject) => QUESTION_NOTES[subject] || '')
      .join('');

    const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are an AP exam item writer who follows the official College Board Course and Exam Description (CED) and the style of released AP multiple-choice questions.

For EACH topic below, write exactly the "needed" number of ORIGINAL multiple-choice questions in authentic AP exam style, spread evenly across easy, medium, and hard difficulties. Each question must directly assess that specific CED topic's learning objective — not general subject knowledge. Vary the scenarios, numbers, and representations (algebraic, graphical, tabular, verbal) so no two questions feel alike.

TOPICS:
${topicList}
${subjectNotes}
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
          course_code: courseCodeOf(topic),
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