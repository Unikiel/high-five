// Shared by the question generator (generateQuestionBank) and the answer checker (verifyQuestionBank).
import { COURSE_NAMES, courseCodeOf } from './courseNames.ts';

const VERIFY_MODEL = 'claude-sonnet-5';
const ITEMS_PER_CALL = 8;
const PARALLEL_CALLS = 6;

export const LETTERS = ['A', 'B', 'C', 'D'];

/** An explanation that argues with itself ("Wait, re-calculating...") marks a question whose key cannot be trusted. */
export const SELF_DOUBT = /\bwait[,.]|let's (re-?)?(check|verify|recalculate|re-evaluate|adjust)|re-?calculat|closest (option|answer|choice)|none of the (options|choices)|intended to be|correction:|\btypo\b/i;

// Text that points at an option's position ("Option B", "none of the above") breaks if the options move.
const POSITION_PHRASE = /\b(all|none|both|neither|either) of the above\b/i;
const POSITION_LETTER = /\b([Oo]ptions?|[Cc]hoices?|[Aa]nswers?) \(?[A-D]\)?(?![A-Za-z'])|(?<![A-Za-z$\\])\([A-D]\)|\b[A-D] is (correct|incorrect|wrong)\b|\b([Bb]oth|[Nn]either) [A-D] (and|nor) [A-D]\b/;

export function pointsAtPositions(question) {
  const text = [...(question.options || []), question.explanation || ''].join('\n');
  return POSITION_PHRASE.test(text) || POSITION_LETTER.test(text);
}

function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Moves the options into a random order and re-points correct_answer, so the key is not always "A". */
export function shuffleOptions(question) {
  if (pointsAtPositions(question)) return question;
  const order = shuffled([0, 1, 2, 3]);
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    correct_answer: LETTERS[order.indexOf(LETTERS.indexOf(question.correct_answer))],
  };
}

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
          answer: { type: 'string' },
          flawed: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['item', 'work', 'answer', 'flawed', 'note'],
      },
    },
  },
  required: ['items'],
};

async function checkBatch(base44, batch, verdicts) {
  const items = batch
    .map((entry, n) => {
      const course = COURSE_NAMES[courseCodeOf(entry.q)] || '';
      const options = entry.order.map((o, k) => `${LETTERS[k]}. ${entry.q.options[o]}`).join('\n');
      return `### Item ${n + 1}${course ? ` (${course})` : ''}\n${entry.q.question_text}\n${options}`;
    })
    .join('\n\n');

  const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: VERIFY_MODEL,
    prompt: `You are an expert AP teacher auditing multiple-choice items for an AP exam prep question bank. For each item, work the problem yourself from scratch, without assuming that any option is correct, and only then compare your result with the options. Math is written in LaTeX between dollar signs; a dollar sign directly before a number is money.

Set "flawed" to true when no option matches the correct result, when more than one option is defensibly correct, when the stem lacks information needed to answer, when the stem contains a factual error, or when the stem puts words in quotation marks that are not from a specific, named, real document. Otherwise set it to false.

${items}

Return one entry per item, in order: item (its number), work (your solution in at most three sentences), answer (A, B, C or D - the best option even when the item is flawed), flawed, and note (one sentence saying what is wrong, or an empty string).`,
    response_json_schema: VERDICT_SCHEMA,
  });

  for (const item of reply?.items || []) {
    const entry = batch[Number(item.item) - 1];
    if (!entry) continue;
    const shown = LETTERS.indexOf(String(item.answer || '').trim().charAt(0).toUpperCase());
    const picked = shown >= 0 ? LETTERS[entry.order[shown]] : null;
    const ok = !item.flawed && picked === entry.q.correct_answer;
    const note = item.flawed
      ? `Flawed question: ${item.note}`
      : `Independent check chose ${picked || 'no option'}, the key says ${entry.q.correct_answer}. ${item.note}`;
    verdicts[entry.index] = { ok, note: ok ? '' : note.trim() };
  }
}

/**
 * Re-solves each multiple-choice question without seeing the key, with the options in a random order.
 * Returns one verdict per question: { ok, note }, or null when the check itself could not be completed.
 */
export async function verifyQuestions(base44, questions) {
  const verdicts = questions.map(() => null);
  const batches = [];
  for (let i = 0; i < questions.length; i += ITEMS_PER_CALL) {
    batches.push(
      questions.slice(i, i + ITEMS_PER_CALL).map((q, k) => ({ q, index: i + k, order: shuffled([0, 1, 2, 3]) })),
    );
  }
  for (let i = 0; i < batches.length; i += PARALLEL_CALLS) {
    await Promise.allSettled(
      batches.slice(i, i + PARALLEL_CALLS).map((batch) => checkBatch(base44, batch, verdicts)),
    );
  }
  return verdicts;
}