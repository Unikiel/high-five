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

function subjectFamily(courseId) {
  if (courseId.includes('CALC')) return 'calculus';
  if (courseId.includes('PHYSICS')) return 'physics';
  if (courseId.includes('CSP') || courseId.includes('CSA')) return 'computer science';
  if (courseId.includes('STATS')) return 'statistics';
  if (courseId.includes('PRECALC')) return 'precalculus';
  return 'AP course';
}

function formulasFor(courseId, title) {
  const text = `${courseId} ${title}`.toLowerCase();
  if (courseId.includes('CALC')) {
    if (text.includes('limit')) return ['\\lim_{x\\to a} f(x)=L', '\\lim_{x\\to a} \\frac{f(x)-f(a)}{x-a}=f\'(a)'];
    if (text.includes('derivative') || text.includes('differenti')) return ['f\'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}', '\\frac{d}{dx}x^n=nx^{n-1}', '(f\\circ g)\'=f\'(g(x))g\'(x)'];
    if (text.includes('integr')) return ['\\int_a^b f(x)\\,dx=F(b)-F(a)', '\\int f(g(x))g\'(x)\\,dx=\\int f(u)\\,du'];
    if (text.includes('series')) return ['\\sum_{n=0}^{\\infty} ar^n=\\frac{a}{1-r}', 'R=\\frac{1}{\\lim |a_{n+1}/a_n|}'];
    return ['f\'(a)=\\lim_{x\\to a}\\frac{f(x)-f(a)}{x-a}', '\\int_a^b f(x)\\,dx'];
  }
  if (courseId.includes('PHYSICS')) {
    if (text.includes('electric') || text.includes('charge')) return ['F=k\\frac{|q_1q_2|}{r^2}', 'E=\\frac{F}{q}', 'V=\\frac{U}{q}'];
    if (text.includes('magnet') || text.includes('induction')) return ['F=qvB\\sin\\theta', '\\mathcal{E}=-\\frac{d\\Phi_B}{dt}', '\\Phi_B=BA\\cos\\theta'];
    if (text.includes('rotation') || text.includes('torque')) return ['\\tau=rF\\sin\\theta', 'I\\alpha=\\sum\\tau', 'K_{rot}=\\frac12 I\\omega^2'];
    if (text.includes('momentum')) return ['p=mv', 'J=\\Delta p', '\\sum p_i=\\sum p_f'];
    if (text.includes('energy') || text.includes('work') || text.includes('power')) return ['W=Fd\\cos\\theta', 'K=\\frac12mv^2', 'P=\\frac{W}{t}'];
    return ['v=v_0+at', 'x=x_0+v_0t+\\frac12at^2', '\\sum F=ma'];
  }
  if (courseId.includes('STATS')) {
    if (text.includes('confidence')) return ['statistic \\pm critical\\ value\\cdot SE', 'SE_{\\hat p}=\\sqrt{\\frac{\\hat p(1-\\hat p)}{n}}'];
    if (text.includes('test') || text.includes('p-value')) return ['z=\\frac{statistic-parameter}{SE}', 'p\\text{-value}=P(\\text{result as extreme as observed})'];
    if (text.includes('regression') || text.includes('slope')) return ['\\hat y=a+bx', 'r=\\frac{1}{n-1}\\sum z_xz_y'];
    return ['z=\\frac{x-\\mu}{\\sigma}', '\\mu_{\\hat p}=p', '\\sigma_{\\hat p}=\\sqrt{\\frac{p(1-p)}{n}}'];
  }
  if (courseId.includes('CSA') || courseId.includes('CSP')) return ['input \\rightarrow process \\rightarrow output', 'time\\ complexity\\approx O(n)', 'condition ? branch_A : branch_B'];
  if (courseId.includes('PRECALC')) return ['f(g(x))=(f\\circ g)(x)', 'a_n=a_1r^{n-1}', 'y=A\\sin(B(x-C))+D'];
  return [];
}

function enrich(topic) {
  const courseName = COURSE_NAMES[topic.course_id] || topic.course_id;
  const family = subjectFamily(topic.course_id);
  const formulas = formulasFor(topic.course_id, topic.title);
  const keyConcepts = [
    `Core idea: ${topic.title}`,
    `How it appears in ${topic.unit_title || 'this unit'}`,
    `Common AP-style representation and reasoning`,
    `Typical mistakes and how to avoid them`,
    `When to apply this method on exam questions`
  ];

  return {
    description: `${courseName} ${topic.topic_number}: ${topic.title}. This topic builds exam-ready understanding through definitions, representations, procedures, and AP-style reasoning.`,
    key_concepts: keyConcepts,
    latex_formulas: formulas,
    lesson_content: `## ${topic.title}\n\n### Definition and Big Idea\n${topic.title} is a required ${courseName} topic in ${topic.unit_title || 'its unit'}. The main goal is to understand what the concept means, recognize how it is represented, and use it to justify answers in AP-style problems.\n\n### Why It Matters\nThis topic connects vocabulary, procedures, and interpretation. On the AP exam, students are often asked not only to compute an answer, but also to explain what the answer means in context.\n\n### How to Analyze Problems\n1. Identify what information is given and what representation is being used: equation, graph, table, code, data display, diagram, or verbal context.\n2. Match the question to the correct ${family} idea.\n3. Choose a valid method and write each step clearly.\n4. Interpret the result using correct units, notation, or context.\n5. Check whether the answer is reasonable and satisfies any stated conditions.\n\n### AP Exam Strategy\nLook for signal words in the prompt, underline the quantity being requested, and show enough reasoning for partial credit. If the problem includes a context, your final sentence should connect the result back to that context.\n\n### Common Mistakes\n- Memorizing a procedure without understanding when it applies.\n- Ignoring units, domains, constraints, or conditions.\n- Giving a numerical result without interpretation.\n- Mixing up similar representations or formulas.`,
    cheatsheet: `Topic: ${topic.title}\nCourse: ${courseName}\nUnit: ${topic.unit_title || 'Current unit'}\n\nKnow:\n- Main definition and vocabulary\n- Required notation or representation\n- The standard AP procedure\n- How to justify the result\n\nUse when:\n- The prompt asks you to interpret, calculate, compare, model, or justify using this topic.\n\nChecklist:\n1. Define the target quantity.\n2. Select the correct method.\n3. Show work clearly.\n4. Interpret the result.\n5. Verify conditions or reasonableness.`,
    worked_examples: [
      {
        problem: `Concept check: Explain the main idea of ${topic.title} in the context of ${courseName}.`,
        solution: `Start by naming the relevant definition, then describe how it is represented in a typical AP problem. A strong answer explains both the procedure and the meaning of the result.`
      },
      {
        problem: `AP-style application: A problem gives a representation related to ${topic.title}. What steps should you take?`,
        solution: `Identify the representation, choose the matching method, carry out the calculation or reasoning, and finish with a contextual interpretation. Include units, notation, or conditions when relevant.`
      }
    ]
  };
}

async function listAll(entityApi) {
  return await entityApi.list('created_date', 1000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 25), 50);
    const startAfterId = body.startAfterId || null;

    const units = await listAll(base44.asServiceRole.entities.Unit);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const allTopics = await listAll(base44.asServiceRole.entities.Topic);
    const topics = allTopics
      .filter((topic) => !topic.worked_examples || topic.worked_examples.length === 0)
      .sort((a, b) => `${a.course_id}-${a.topic_number}`.localeCompare(`${b.course_id}-${b.topic_number}`));
    const startIndex = startAfterId ? Math.max(topics.findIndex((topic) => topic.id === startAfterId) + 1, 0) : 0;
    const batch = topics.slice(startIndex, startIndex + limit);
    let enriched = 0;

    for (const topic of batch) {
      const unit = unitById.get(topic.unit_id);
      const payload = enrich({ ...topic, unit_title: unit?.title });
      await base44.asServiceRole.entities.Topic.update(topic.id, payload);
      enriched += 1;
    }

    return Response.json({
      enriched,
      remaining: Math.max(topics.length - startIndex - enriched, 0),
      nextStartAfterId: batch.length ? batch[batch.length - 1].id : null
    });
  } catch (error) {
    console.error('enrichCourseContent error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});