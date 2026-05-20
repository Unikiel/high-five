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

    const generated = await generateBatch(base44, topics);
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