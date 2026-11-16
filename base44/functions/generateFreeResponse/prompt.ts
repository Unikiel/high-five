import { COURSE_NAMES, COURSE_SUBJECT, MONEY_RULE, courseCodeOf } from '../../shared/courseNames.ts';

const SUBJECT_NOTES = {
  economics: `
SUBJECT NOTES (economics topics):
- Model the question on an AP Economics free-response question: a scenario with concrete numbers, then parts that ask the student to calculate (showing the work), identify what changes, and explain why using the relevant model.
- Never ask for a graph. Ask instead what happens to a named curve, price, quantity, output or interest rate, and why. When the question depends on a graph or table, describe it in words inside the question, with table rows as short plain-text lines.
${MONEY_RULE}
`,
  psychology: `
SUBJECT NOTES (psychology topics):
- Model the question on the AP Psychology Article Analysis Question or a concept-application question: summarise a realistic study (participants, method, variables, result) or describe a concrete scenario, then ask parts such as identifying the research method, stating an operational definition, interpreting a statistic, naming the ethical guideline that applies, judging generalizability, or applying a named concept to the scenario.
- Use the exact terminology of the current AP Psychology CED (2024-25 framework). Do not use LaTeX for ordinary text.
${MONEY_RULE}
`,
  history: `
SUBJECT NOTES (U.S. history topics):
- Model the question on the AP U.S. History short-answer question: exactly three parts, (a), (b) and (c), each worth one point, each asking the student to briefly describe or explain ONE specific historical development, cause, effect, similarity or difference within a stated time period.
- A stimulus is optional. If one is used it must be a short, accurate quotation from a specific real document named with its author, title and year, or a historian's interpretation written as a summary that begins "A historian argues that ...". Never put invented words in quotation marks.
- Each scoring-guide point says what an acceptable response must do and names two or three examples of specific evidence that would earn it.
- Do not use LaTeX.
${MONEY_RULE}
`,
};

export const FREE_RESPONSE_SCHEMA = {
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
          rubric: { type: 'array', items: { type: 'string' } },
          model_answer: { type: 'string' },
        },
        required: ['topic_id', 'difficulty', 'question_text', 'rubric', 'model_answer'],
      },
    },
  },
  required: ['questions'],
};

/** Prompt for one call. Each topic carries unit_title and needed (how many written questions it still lacks). */
export function buildPrompt(topics) {
  const topicList = topics
    .map((t) => `topic_id=${t.id} | needed=${t.needed} questions | ${COURSE_NAMES[courseCodeOf(t)] || courseCodeOf(t)} | Unit: ${t.unit_title} | Topic ${t.topic_number}: ${t.title}`)
    .join('\n');

  const subjectNotes = [...new Set(topics.map((t) => COURSE_SUBJECT[courseCodeOf(t)]))]
    .map((subject) => SUBJECT_NOTES[subject] || '')
    .join('');

  return `You are an AP exam item writer who follows the official College Board Course and Exam Description (CED) and the style of released AP free-response questions and their scoring guidelines.

For EACH topic below, write exactly the "needed" number of ORIGINAL free-response questions. Each question must directly assess that specific CED topic's learning objective. When a topic needs two questions, they must use different scenarios and different task types.

Students TYPE their answers on a keyboard and an AI scores them against your scoring guide, so every part must be answerable in typed text.

TOPICS:
${topicList}
${subjectNotes}
Requirements per question:
- topic_id: exactly as given
- difficulty: "medium" or "hard"
- question_text: a scenario or setup with concrete numbers, functions, data, code or sources, then two to four parts labelled (a), (b), (c), (d), each part on its own line. The parts build on each other, and at least one part asks the student to justify, explain or interpret rather than only compute. Never ask the student to draw, sketch, graph or label a diagram. There are no images: describe any graph, table, diagram or circuit in words.
- rubric: the scoring guide, three to six points, each worth exactly one point. Each entry is one sentence that names the part it belongs to and states exactly what the response must show to earn the point, for example "Part (b): sets up the integral $\\int_0^4 v(t)\\,dt$ for the total distance". Points are independent of each other, can be checked from a typed answer, and together cover every part.
- model_answer: a complete full-credit response with the work shown, each part starting on a new line with its label. It must earn every point of the scoring guide. Give only the final, clean solution: no second thoughts or corrections.
- Embed ALL math as inline LaTeX wrapped in single dollar signs. Never use $$ display math and never leave an unmatched $. For AP Computer Science A, ask the student to write or complete Java code and give the model answer as plain, indented Java. For AP Computer Science Principles, use the AP pseudocode style or a written-response prompt about a program.

Return JSON only.`;
}