import { COURSE_NAMES, courseCodeOf } from '../../shared/courseNames.ts';

const CHECK_MODEL = 'claude-sonnet-5';

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'number' },
          work: { type: 'string' },
          flawed: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['item', 'work', 'flawed', 'note'],
      },
    },
  },
  required: ['items'],
};

/**
 * Independent audit of drafted free-response questions. Returns one boolean per draft:
 * true only when the question, its scoring guide and its model answer all hold up.
 */
export async function checkFreeResponse(base44, drafts) {
  if (drafts.length === 0) return [];

  const items = drafts
    .map((q, n) => {
      const course = COURSE_NAMES[courseCodeOf(q)] || '';
      const guide = q.rubric.map((point, k) => `${k + 1}. ${point}`).join('\n');
      return `### Item ${n + 1}${course ? ` (${course})` : ''}\nQUESTION:\n${q.question_text}\n\nSCORING GUIDE:\n${guide}\n\nMODEL ANSWER:\n${q.correct_answer}`;
    })
    .join('\n\n');

  const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: CHECK_MODEL,
    prompt: `You are an expert AP teacher auditing free-response questions for an AP exam prep site. Students type their answers and an AI scores them against the scoring guide, so a wrong model answer or scoring guide would mislead students. For each item, work the question yourself from scratch before reading its model answer. Math is written in LaTeX between dollar signs; a dollar sign directly before a number is money.

Set "flawed" to true when the model answer contains a mathematical, factual or coding error; when the question lacks information needed to answer it or contains a factual error; when a part cannot be answered in typed text (it asks for a drawing, sketch or graph); when a scoring-guide point rewards something incorrect, rewards something the question does not ask for, or is too vague to check; when the model answer would not earn every point of the scoring guide; or when the question puts words in quotation marks that are not from a specific, named, real document. Otherwise set it to false.

${items}

Return one entry per item, in order: item (its number), work (your own solution in at most three sentences), flawed, and note (one sentence saying what is wrong, or an empty string).`,
    response_json_schema: VERDICT_SCHEMA,
  });

  const passed = drafts.map(() => false);
  for (const verdict of reply?.items || []) {
    const index = Number(verdict.item) - 1;
    if (index >= 0 && index < passed.length) passed[index] = verdict.flawed === false;
  }
  return passed;
}