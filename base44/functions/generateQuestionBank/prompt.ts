import { COURSE_NAMES, COURSE_SUBJECT, MONEY_RULE, courseCodeOf } from '../../shared/courseNames.ts';

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

const QUESTION_MIX = `
QUESTION MIX - these are AP exam items, never vocabulary or recall checks:
- No question may be answerable by recalling a definition or a formula alone. Every stem gives a concrete situation the student must analyze: a function, a data set, a graph or table described in words, an experiment, an argument, a source, or a code segment.
- Within one topic, no two questions may use the same task type. Rotate through: (1) a multi-step calculation or derivation; (2) interpreting a graph, table or data set described in the stem; (3) "Which of the following must be true?" with statements I, II and III in the stem and options such as "I only" or "I and II only"; (4) finding the error in a worked solution, argument, experimental design or code segment shown in the stem; (5) predicting or comparing what happens when one condition changes; (6) choosing the best justification or evidence for a claim.
- Difficulty: "easy" = one concept applied to an unfamiliar situation; "medium" = two linked steps or concepts; "hard" = this topic combined with an earlier topic of the course, a non-routine setup, or a subtle condition that makes the obvious approach fail.
- Solve every question completely before writing its options. Exactly one option is correct and it matches your result exactly; if your work does not land on an option, rewrite the question. Never write "all of the above" or "none of the above".
`;

export const QUESTIONS_SCHEMA = {
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
          explanation: { type: 'string' },
        },
        required: ['topic_id', 'difficulty', 'question_text', 'options', 'correct_answer', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

/** Prompt for one call. Each topic carries unit_title and needed (how many questions it still lacks). */
export function buildPrompt(topics) {
  const topicList = topics
    .map((t) => `topic_id=${t.id} | needed=${t.needed} questions | ${COURSE_NAMES[courseCodeOf(t)] || courseCodeOf(t)} | Unit: ${t.unit_title} | Topic ${t.topic_number}: ${t.title}`)
    .join('\n');

  const subjectNotes = [...new Set(topics.map((t) => COURSE_SUBJECT[courseCodeOf(t)]))]
    .map((subject) => QUESTION_NOTES[subject] || '')
    .join('');

  return `You are an AP exam item writer who follows the official College Board Course and Exam Description (CED) and the style of released AP multiple-choice questions.

For EACH topic below, write exactly the "needed" number of ORIGINAL multiple-choice questions in authentic AP exam style, spread evenly across easy, medium, and hard difficulties. Each question must directly assess that specific CED topic's learning objective — not general subject knowledge. Vary the scenarios, numbers, and representations (algebraic, graphical, tabular, verbal) so no two questions feel alike.

TOPICS:
${topicList}
${QUESTION_MIX}${subjectNotes}
Requirements per question:
- topic_id: exactly as given
- difficulty: "easy", "medium", or "hard"
- question_text: a complete AP-style stem with concrete numbers, functions, data, scenarios, or code. Embed ALL math as inline LaTeX wrapped in single dollar signs, e.g. $\\int_0^2 x^2\\,dx$. Never use $$ display math, never leave an unmatched $, and never write a literal backslash-n for a line break — use a real line break only for code. For AP CSA include real Java code in the stem when appropriate (plain text, indented).
- options: exactly 4 different answer choices (values/expressions only, no "A)" prefixes). Distractors must reflect realistic student errors (sign errors, off-by-one, wrong rule, condition ignored). Math in options also uses $...$ LaTeX.
- correct_answer: the letter "A", "B", "C", or "D" matching the position of the correct option. The options are put in a random order afterwards, so never refer to an option by its letter or position anywhere.
- explanation: 2-4 sentences showing the correct solution work with $...$ LaTeX and why the answer is right. Give only the final, clean solution: no second thoughts, corrections, or option letters.

Return JSON only.`;
}