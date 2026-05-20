import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const topicTemplates = [
  'Core Concepts and Vocabulary',
  'Representations, Models, and Graphs',
  'Problem-Solving Strategies',
  'Exam-Style Multiple Choice',
  'Free-Response Reasoning and Worked Examples'
];

const formulasByCourse = {
  AP_CALC_AB: ['$\\lim_{x\\to a} f(x)=L$', '$f\\\'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}$', '$\\int_a^b f(x)\\,dx$'],
  AP_CALC_BC: ['$\\sum a_n$', '$T_n(x)=\\sum_{k=0}^{n}\\frac{f^{(k)}(a)}{k!}(x-a)^k$', '$\\frac{dy}{dx}=\\frac{dy/dt}{dx/dt}$'],
  AP_PHYSICS_1: ['$v=v_0+at$', '$F_{net}=ma$', '$K=\\frac12mv^2$', '$p=mv$'],
  AP_PHYSICS_2: ['$P=P_0+\\rho gh$', '$PV=nRT$', '$E=\\frac{kq}{r^2}$', '$V=IR$'],
  AP_PHYSICS_CM: ['$\\vec v=\\frac{d\\vec r}{dt}$', '$\\vec F=m\\frac{d^2\\vec r}{dt^2}$', '$W=\\int \\vec F\\cdot d\\vec r$'],
  AP_PHYSICS_CE: ['$\\oint \\vec E\\cdot d\\vec A=\\frac{Q}{\\epsilon_0}$', '$C=\\frac{Q}{V}$', '$\\mathcal{E}=-\\frac{d\\Phi_B}{dt}$'],
  AP_CSP: ['algorithm = finite step-by-step process', 'binary data represents information', 'abstraction reduces complexity'],
  AP_CSA: ['int, double, boolean', 'object.method()', 'for(initialization; condition; update)', 'class Name { }'],
  AP_STATS: ['$z=\\frac{x-\\mu}{\\sigma}$', '$\\hat p \\pm z^*\\sqrt{\\frac{\\hat p(1-\\hat p)}{n}}$', '$t=\\frac{\\bar x-\\mu}{s/\\sqrt n}$'],
  AP_PRECALC: ['$f(g(x))$', '$a\\cdot b^x$', '$\\sin^2x+\\cos^2x=1$', '$r=f(\\theta)$']
};

const optionSets = [
  ['Use the definition and identify the given information first.', 'Ignore units and estimate only.', 'Choose the largest number in the problem.', 'Assume every graph is linear.'],
  ['The model connects the representation to the underlying concept.', 'The answer must always be positive.', 'Only memorized formulas matter.', 'The context can be ignored.'],
  ['Check assumptions, substitute carefully, and justify the result.', 'Round all values before starting.', 'Use every number exactly once.', 'Skip the explanation if the answer looks familiar.'],
  ['Compare the result with the meaning of the unit and context.', 'Select the shortest option.', 'Change the question to an easier one.', 'Assume proportionality without evidence.']
];

function buildLesson(courseId, unitTitle, topicTitle) {
  return `${topicTitle} develops the essential ideas from ${unitTitle}. Students should connect definitions, representations, procedures, and contextual meaning rather than memorize isolated facts.\n\nFocus on identifying what is given, choosing an appropriate model, carrying out the calculation or reasoning clearly, and checking that the result makes sense in the context. Strong AP responses include setup, justification, and interpretation.\n\nWorked Example 1: A problem asks you to apply ${topicTitle.toLowerCase()} in a new context. First identify the relevant concept from ${unitTitle}, write the governing relationship, substitute known quantities, and simplify carefully. The final sentence should explain what the answer means.\n\nWorked Example 2: When a graph, table, code segment, experiment, or scenario is provided, translate it into the correct representation before solving. Use labels, units, and assumptions to avoid common AP distractors.`;
}

function buildTopic(unit, index) {
  const topicTitle = `${unit.title}: ${topicTemplates[index - 1]}`;
  const concepts = [
    `Define the central vocabulary of ${unit.title}.`,
    `Connect symbolic, graphical, numerical, and verbal representations.`,
    `Explain reasoning using AP-style justification.`,
    `Recognize common distractors and misconceptions.`
  ];

  return {
    unit_id: unit.id,
    course_id: unit.course_id,
    title: topicTitle,
    topic_number: `${unit.unit_number}.${index}`,
    description: `A focused AP-aligned lesson on ${topicTitle}.`,
    key_concepts: concepts,
    latex_formulas: formulasByCourse[unit.course_id] || ['AP concept relationship', 'model → solve → interpret'],
    lesson_content: buildLesson(unit.course_id, unit.title, topicTitle),
    cheatsheet: concepts.map((c, i) => `${i + 1}. ${c}`).join('\n'),
    worked_examples: [
      {
        problem: `Worked example: Apply ${topicTitle} to a typical AP classroom or exam scenario.`,
        solution: `Identify the concept, set up the model, solve step by step, and interpret the answer using the language of ${unit.title}.`
      },
      {
        problem: `Worked example: Explain why a tempting distractor is incorrect for ${topicTitle}.`,
        solution: `Compare the distractor with the definition, representation, or assumption required by the problem, then state the correct reasoning.`
      }
    ],
    order: index
  };
}

function buildQuestion(unit, topic, number) {
  const set = optionSets[number % optionSets.length];
  const difficulty = number % 3 === 0 ? 'hard' : number % 3 === 1 ? 'easy' : 'medium';
  const correctIndex = number % 4;
  const letters = ['A', 'B', 'C', 'D'];
  const options = [...set];
  const correct = options[correctIndex];
  options[correctIndex] = set[0];
  options[0] = correct;

  return {
    course_id: unit.course_id,
    unit_id: unit.id,
    topic_id: topic.id,
    type: 'multiple_choice',
    difficulty,
    question_text: `(${unit.course_id}) Unit ${unit.unit_number} — ${unit.title}. Question ${number}: Which choice best supports AP-level reasoning for ${topic.title}?`,
    options,
    correct_answer: letters[correctIndex === 0 ? 0 : correctIndex],
    explanation: `The correct choice uses the relevant concept from ${unit.title}, applies it to the representation or context, and includes interpretation rather than guessing.`,
    tags: [unit.course_id, `unit-${unit.unit_number}`, topic.topic_number, difficulty],
    is_active: true
  };
}

async function createChunks(entityApi, records, size = 50) {
  for (let i = 0; i < records.length; i += size) {
    await entityApi.bulkCreate(records.slice(i, i + size));
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const maxUnits = Number(body.maxUnits || 6);

    const units = await base44.asServiceRole.entities.Unit.list('course_id', 1000);
    const existingTopics = await base44.asServiceRole.entities.Topic.list('created_date', 1000);
    const existingQuestions = await base44.asServiceRole.entities.Question.list('created_date', 10000);

    const topicKeys = new Set(existingTopics.map((t) => `${t.unit_id}:${t.topic_number}`));
    const questionUnitCounts = existingQuestions.reduce((acc, q) => {
      acc[q.unit_id] = (acc[q.unit_id] || 0) + 1;
      return acc;
    }, {});

    const topicsToCreate = [];
    for (const unit of units) {
      for (let i = 1; i <= 5; i++) {
        const key = `${unit.id}:${unit.unit_number}.${i}`;
        if (!topicKeys.has(key)) topicsToCreate.push(buildTopic(unit, i));
      }
    }

    if (topicsToCreate.length > 0) {
      await createChunks(base44.asServiceRole.entities.Topic, topicsToCreate, 50);
    }

    const allTopics = await base44.asServiceRole.entities.Topic.list('created_date', 1000);
    const topicsByUnit = allTopics.reduce((acc, topic) => {
      if (!acc[topic.unit_id]) acc[topic.unit_id] = [];
      acc[topic.unit_id].push(topic);
      return acc;
    }, {});

    const questionsToCreate = [];
    const unitsNeedingQuestions = units
      .filter((unit) => (questionUnitCounts[unit.id] || 0) < 100)
      .slice(0, maxUnits);

    for (const unit of unitsNeedingQuestions) {
      const currentCount = questionUnitCounts[unit.id] || 0;
      const needed = Math.max(0, 100 - currentCount);
      const unitTopics = (topicsByUnit[unit.id] || []).sort((a, b) => a.order - b.order);
      for (let i = 1; i <= needed; i++) {
        const topic = unitTopics[(i - 1) % unitTopics.length];
        if (topic) questionsToCreate.push(buildQuestion(unit, topic, currentCount + i));
      }
    }

    if (questionsToCreate.length > 0) {
      await createChunks(base44.asServiceRole.entities.Question, questionsToCreate, 50);
    }

    return Response.json({
      units: units.length,
      units_processed_for_questions: unitsNeedingQuestions.length,
      remaining_units_below_100_questions: Math.max(0, units.filter((unit) => (questionUnitCounts[unit.id] || 0) < 100).length - unitsNeedingQuestions.length),
      topics_created: topicsToCreate.length,
      questions_created: questionsToCreate.length
    });
  } catch (error) {
    console.error('seedCourseContent error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});