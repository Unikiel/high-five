import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

const GENERIC_MARKERS = [
  '## Calculus Lesson Guide',
  '## Physics Lesson Guide',
  '## Computer Science Lesson Guide',
  '## Statistics Lesson Guide',
  '## Precalculus Lesson Guide'
];

async function listAll(entityApi) {
  return await entityApi.list('created_date', 1000);
}

function isGenericTopic(topic) {
  const content = topic.lesson_content || '';
  return GENERIC_MARKERS.some((marker) => content.includes(marker));
}

function subjectRules(courseId) {
  if (courseId.includes('CALC')) return 'Calculus: include precise limits/derivative/integral/series formulas only when directly relevant. Emphasize representations, AP justifications, and exact notation.';
  if (courseId.includes('PHYSICS')) return 'Physics: include only relevant mechanics, E&M, fluids, thermo, waves, optics, or modern physics equations. Emphasize diagrams, assumptions, units, and physical meaning.';
  if (courseId.includes('STATS')) return 'Statistics: include only relevant descriptive statistics, probability, sampling, inference, chi-square, or regression formulas. Emphasize conditions, interpretation, and context.';
  if (courseId.includes('CSA')) return 'Computer Science A: focus on Java objects, methods, control flow, arrays, ArrayLists, inheritance, polymorphism, searching/sorting, or recursion as relevant. Avoid fake math formulas.';
  if (courseId.includes('CSP')) return 'Computer Science Principles: focus on algorithms, abstraction, data, networks, impacts, simulations, and program purpose. Avoid fake math formulas.';
  if (courseId.includes('PRECALC')) return 'Precalculus: include only relevant function, trigonometric, polar, parametric, vector, matrix, logarithmic, or rational formulas. Emphasize graph features and model interpretation.';
  return 'Use the course title and AP topic title to create precise, relevant content.';
}

function statsFocus(title) {
  const t = title.toLowerCase();
  if (t.includes('normal')) return { area: 'normal distributions and z-scores', formulas: ['z=\\frac{x-\\mu}{\\sigma}', 'x=\\mu+z\\sigma'], action: 'standardize values, use normal areas, and interpret percentiles' };
  if (t.includes('categorical') || t.includes('tables')) return { area: 'categorical data summaries', formulas: ['relative\\ frequency=\\frac{count}{total}', 'conditional\\ percent=\\frac{cell}{row\\ or\\ column\\ total}'], action: 'compare counts, marginal distributions, and conditional distributions' };
  if (t.includes('quantitative') || t.includes('summary') || t.includes('boxplot')) return { area: 'quantitative distributions', formulas: ['IQR=Q_3-Q_1', 'z=\\frac{x-\\bar{x}}{s}'], action: 'describe shape, center, variability, and unusual features' };
  if (t.includes('correlation')) return { area: 'linear association strength', formulas: ['-1\\le r\\le 1', 'r=\\frac{1}{n-1}\\sum z_xz_y'], action: 'describe direction, strength, and form without implying causation' };
  if (t.includes('regression') || t.includes('slope') || t.includes('residual')) return { area: 'least-squares regression', formulas: ['\\hat y=a+bx', 'residual=y-\\hat y', 'b=r\\frac{s_y}{s_x}'], action: 'interpret slope, intercept, residuals, and model fit' };
  if (t.includes('sampling') || t.includes('sample')) return { area: 'sampling and sampling distributions', formulas: ['\\mu_{\\bar{x}}=\\mu', '\\sigma_{\\bar{x}}=\\frac{\\sigma}{\\sqrt n}', '\\mu_{\\hat p}=p'], action: 'separate parameters from statistics and describe sampling variability' };
  if (t.includes('experiment') || t.includes('study') || t.includes('design')) return { area: 'study design', formulas: [], action: 'identify treatments, random assignment, control, replication, and valid conclusions' };
  if (t.includes('probability') || t.includes('independent') || t.includes('mutually') || t.includes('conditional')) return { area: 'probability rules', formulas: ['P(A\\cup B)=P(A)+P(B)-P(A\\cap B)', 'P(A|B)=\\frac{P(A\\cap B)}{P(B)}'], action: 'use probability rules while checking independence and mutually exclusive events' };
  if (t.includes('binomial')) return { area: 'binomial random variables', formulas: ['P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}', '\\mu_X=np', '\\sigma_X=\\sqrt{np(1-p)}'], action: 'verify BINS conditions and compute binomial probabilities' };
  if (t.includes('geometric')) return { area: 'geometric random variables', formulas: ['P(X=k)=(1-p)^{k-1}p', '\\mu_X=\\frac{1}{p}'], action: 'model the number of trials until the first success' };
  if (t.includes('confidence interval')) return { area: 'confidence intervals', formulas: ['statistic\\pm critical\\ value\\cdot SE', 'SE_{\\hat p}=\\sqrt{\\frac{\\hat p(1-\\hat p)}{n}}', 'SE_{\\bar{x}}=\\frac{s}{\\sqrt n}'], action: 'estimate a parameter with uncertainty and interpret confidence' };
  if (t.includes('test') || t.includes('p-value') || t.includes('claim')) return { area: 'significance testing', formulas: ['test\\ statistic=\\frac{statistic-null}{SE}', 'p\\text{-value}=P(\\text{result as extreme as observed}|H_0)'], action: 'write hypotheses, calculate evidence, and make contextual conclusions' };
  if (t.includes('chi-square')) return { area: 'chi-square procedures', formulas: ['\\chi^2=\\sum\\frac{(O-E)^2}{E}', 'df=categories-1'], action: 'compare observed and expected counts' };
  if (t.includes('variable') || t.includes('variation')) return { area: 'variables and variation', formulas: [], action: 'classify variables and explain how variation drives statistical questions' };
  return { area: 'statistical reasoning', formulas: [], action: 'connect data, variability, method choice, and interpretation' };
}

function buildStatsContent(topic) {
  const focus = statsFocus(topic.title);
  return {
    description: `${topic.title} focuses on ${focus.area} and how AP Statistics expects students to ${focus.action} in context.`,
    key_concepts: [
      `Recognize when a problem is about ${focus.area}`,
      `Choose a method based on variable type and question wording`,
      `Use labels, units, and statistical notation correctly`,
      `Check relevant conditions before drawing conclusions`,
      `Interpret results in the exact scenario given`
    ],
    latex_formulas: focus.formulas,
    lesson_content: `## Big Idea\n${topic.title} is about ${focus.area}. The AP exam rewards explanations that connect calculations to the real context, not memorized generic wording.\n\n## What You Must Know\nStart by identifying the variable, population, sample, and goal of the question. For ${topic.title}, the goal is to ${focus.action}. Use the vocabulary of the topic and make sure each number you report has meaning.\n\n## How AP Tests It\nAP Statistics questions often ask you to justify a graph, compute a statistic, compare groups, describe uncertainty, or interpret evidence. A full-credit response for ${topic.title} names the correct idea, shows supporting work, checks conditions when needed, and writes a conclusion tied to the original context.\n\n## Common Mistakes\nAvoid calculator-only answers, unsupported causation claims, mixing up parameters and statistics, and conclusions that could apply to any statistics problem instead of this one.`,
    cheatsheet: `${topic.title}\nFocus: ${focus.area}\nDo: ${focus.action}\nAlways: define variables, check conditions, show notation, interpret in context\nAvoid: generic conclusions and unsupported causation claims`,
    worked_examples: [
      { problem: `A question about ${topic.title.toLowerCase()} gives a real-world dataset. What should you identify first?`, solution: `Identify the variable type, the group or population, and what the prompt asks you to do. That determines the correct statistical method for ${topic.title}.` },
      { problem: `What should a final AP-style answer for ${topic.title.toLowerCase()} include?`, solution: `It should include the statistical result plus a sentence explaining what that result means for the specific people, objects, or process in the prompt.` }
    ]
  };
}

async function generateBatch(base44, items) {
  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Create original AP study content inspired only by the idea of concise AP study guides and practice support. Do not copy Fiveable or any source. Do not use generic subject-wide templates. Every topic must have content specific to its exact title and unit.\n\nFor each topic, return:\n- description: one sentence specific to the topic\n- key_concepts: 5 short, topic-specific bullets\n- latex_formulas: 0-5 formulas; include only formulas directly relevant to this exact topic; for CS use [] unless a real concept notation is helpful\n- lesson_content: markdown with sections: Big Idea, What You Must Know, How AP Tests It, Common Mistakes. Each section must mention the actual topic and use details that would not fit every other topic.\n- cheatsheet: compact newline checklist specific to the topic\n- worked_examples: exactly 2 examples with concrete problem and solution; examples must be specific, not generic.\n\nSubject rules:\n${items.map((item) => `${item.id}: ${COURSE_NAMES[item.course_id]} / ${item.unit_title} / ${item.topic_number} ${item.title} — ${subjectRules(item.course_id)}`).join('\n')}\n\nReturn JSON only.`,
    response_json_schema: {
      type: 'object',
      properties: {
        topics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              key_concepts: { type: 'array', items: { type: 'string' } },
              latex_formulas: { type: 'array', items: { type: 'string' } },
              lesson_content: { type: 'string' },
              cheatsheet: { type: 'string' },
              worked_examples: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    problem: { type: 'string' },
                    solution: { type: 'string' }
                  },
                  required: ['problem', 'solution']
                }
              }
            },
            required: ['id', 'description', 'key_concepts', 'latex_formulas', 'lesson_content', 'cheatsheet', 'worked_examples']
          }
        }
      },
      required: ['topics']
    }
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 6), 10);
    const courseId = body.course_id || null;
    const force = body.force !== false;

    const units = await listAll(base44.asServiceRole.entities.Unit);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const allTopics = await listAll(base44.asServiceRole.entities.Topic);
    const topics = allTopics
      .filter((topic) => !courseId || topic.course_id === courseId)
      .filter((topic) => force ? isGenericTopic(topic) : (!topic.lesson_content || !topic.worked_examples?.length))
      .sort((a, b) => `${a.course_id}-${String(a.topic_number).padStart(5, '0')}`.localeCompare(`${b.course_id}-${String(b.topic_number).padStart(5, '0')}`))
      .slice(0, limit)
      .map((topic) => ({ ...topic, unit_title: unitById.get(topic.unit_id)?.title || '' }));

    if (topics.length === 0) {
      return Response.json({ enriched: 0, remaining: 0 });
    }

    const generated = courseId === 'AP_STATS'
      ? { topics: topics.map((topic) => ({ id: topic.id, ...buildStatsContent(topic) })) }
      : await generateBatch(base44, topics);
    const byId = new Map((generated.topics || []).map((topic) => [topic.id, topic]));
    let enriched = 0;

    for (const topic of topics) {
      const content = byId.get(topic.id);
      if (!content) continue;
      await base44.asServiceRole.entities.Topic.update(topic.id, {
        description: content.description,
        key_concepts: content.key_concepts,
        latex_formulas: content.latex_formulas,
        lesson_content: content.lesson_content,
        cheatsheet: content.cheatsheet,
        worked_examples: content.worked_examples
      });
      enriched += 1;
    }

    const remaining = allTopics.filter((topic) => (!courseId || topic.course_id === courseId) && isGenericTopic(topic)).length - enriched;
    return Response.json({ enriched, remaining: Math.max(remaining, 0), course_id: courseId || 'all' });
  } catch (error) {
    console.error('enrichCourseContent error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});