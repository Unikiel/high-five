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

function csaFocus(title) {
  const t = title.toLowerCase();
  if (t.includes('primitive')) return { area: 'primitive data types', definitions: ['int: whole-number primitive type', 'double: decimal primitive type', 'boolean: true-or-false primitive type'], example: 'Choose int for a count, double for an average, and boolean for a condition.' };
  if (t.includes('object')) return { area: 'objects and references', definitions: ['object: an instance of a class', 'reference variable: stores the location of an object', 'null: no object reference'], example: 'String name = new String("Ada"); creates an object and stores its reference in name.' };
  if (t.includes('method') || t.includes('signature')) return { area: 'method calls and signatures', definitions: ['method signature: method name plus parameter list', 'return type: data type a method sends back', 'void: method returns no value'], example: 'int total = score.getPoints(); calls getPoints and stores the returned int.' };
  if (t.includes('wrapper')) return { area: 'wrapper classes', definitions: ['Integer: object wrapper for int', 'Double: object wrapper for double', 'autoboxing: automatic primitive-to-wrapper conversion', 'unboxing: automatic wrapper-to-primitive conversion'], example: 'ArrayList<Integer> scores = new ArrayList<Integer>(); uses Integer because ArrayList stores objects, not int primitives.' };
  if (t.includes('string')) return { area: 'String objects', definitions: ['String: immutable sequence of characters', 'substring(start,end): returns characters from start through end-1', 'indexOf(str): returns first index or -1'], example: '"computer".substring(0,4) returns "comp".' };
  if (t.includes('boolean') || t.includes('if')) return { area: 'Boolean expressions and selection', definitions: ['&&: true only when both sides are true', '||: true when at least one side is true', '!: negates a Boolean value'], example: 'if (score >= 90 && late == false) only runs when both conditions are satisfied.' };
  if (t.includes('loop') || t.includes('iteration')) return { area: 'iteration', definitions: ['for loop: repeats with initialization, condition, and update', 'while loop: repeats while a condition remains true', 'off-by-one error: loop runs one too many or one too few times'], example: 'for (int i = 0; i < nums.length; i++) visits every valid array index.' };
  if (t.includes('arraylist')) return { area: 'ArrayList', definitions: ['ArrayList: resizable list of objects', 'size(): number of elements', 'get(index): reads an element', 'remove(index): deletes and shifts later elements left'], example: 'When removing while traversing, adjust the index or traverse backward to avoid skipping elements.' };
  if (t.includes('array')) return { area: 'arrays', definitions: ['array: fixed-length indexed collection', 'length: number of array elements', 'index: position starting at 0'], example: 'scores[scores.length - 1] accesses the last score.' };
  if (t.includes('inheritance')) return { area: 'inheritance', definitions: ['extends: creates an is-a relationship', 'super: accesses superclass constructor or method', 'overriding: subclass provides its own method implementation'], example: 'class Dog extends Animal means every Dog can be treated as an Animal.' };
  if (t.includes('polymorphism')) return { area: 'polymorphism', definitions: ['polymorphism: superclass reference can hold subclass object', 'dynamic dispatch: Java chooses the overridden method at runtime'], example: 'Animal a = new Dog(); a.speak(); runs Dog\'s speak method if it overrides Animal\'s method.' };
  if (t.includes('recursion')) return { area: 'recursion', definitions: ['base case: condition that stops recursion', 'recursive call: method calls itself on a smaller problem', 'call stack: stores unfinished method calls'], example: 'A recursive factorial stops at n == 1 and otherwise returns n * factorial(n - 1).' };
  return { area: title, definitions: ['trace: follow code step by step', 'state: current variable values', 'edge case: input that tests a boundary'], example: 'Trace each assignment, branch, and loop update before choosing an answer.' };
}

function buildCSAContent(topic) {
  const focus = csaFocus(topic.title);
  return {
    description: `${topic.title} teaches ${focus.area} in Java and how AP CSA expects students to read, trace, and explain code accurately.`,
    key_concepts: [
      `Define the main vocabulary for ${focus.area}`,
      `Trace Java code involving ${topic.title}`,
      `Predict output and final variable values`,
      `Recognize common AP distractors and edge cases`,
      `Explain why a code segment works or fails`
    ],
    latex_formulas: focus.definitions,
    lesson_content: `Definition and Big Idea\n${topic.title} focuses on ${focus.area}. On the AP Computer Science A exam, this topic is tested through short Java code segments, object behavior, method calls, and questions that require exact tracing rather than vague descriptions.\n\nCore Definitions\n${focus.definitions.join('\n')}\n\nHow It Works\n${focus.example} The key is to identify the type of each value, what operation Java performs, and whether the result changes an object, returns a value, or only changes a local variable.\n\nAP Exam Strategy\nBefore answering, mark the variable types, trace one line at a time, and write down changed values after each statement. For ${topic.title}, pay special attention to Java rules that are easy to overlook, because many wrong choices are based on a single skipped update or mistaken type assumption.\n\nCommon Mistakes\nDo not describe the idea generally without tracing the code. Avoid assuming that primitives and objects behave the same way, forgetting zero-based indexing, ignoring return values, or missing changes caused by mutation.`,
    cheatsheet: [
      `Topic focus: ${focus.area}`,
      `Know these definitions: ${focus.definitions.join('; ')}`,
      `Trace code line by line and record variable changes`,
      `Check Java type rules before predicting output`,
      `Look for edge cases such as 0, 1, null, empty strings, and boundary indexes`,
      `Explain behavior using Java vocabulary, not generic wording`
    ].join('\n'),
    worked_examples: [
      { problem: `In ${topic.title}, what should you identify before tracing a code segment?`, solution: `Identify each variable's declared type, the value it currently stores, and whether each operation returns a new value or changes an existing object. For this topic, that prevents confusing ${focus.area} with a generic algorithm question.` },
      { problem: `AP-style example: ${focus.example} What is the safest way to justify the result?`, solution: `State the Java rule being used, trace the relevant statement, then connect the final value or behavior back to that rule. A complete answer names the concept, shows the step, and explains the result.` },
      { problem: `What mistake is most likely on a multiple-choice question about ${topic.title}?`, solution: `A distractor will usually skip one update, apply the wrong type rule, or assume behavior that Java does not use. Re-tracing the exact line that changes the value is the best way to eliminate it.` }
    ]
  };
}

function calculusFocus(title) {
  const t = title.toLowerCase();
  if (t.includes('chain') || t.includes('composite')) return { area: 'the Chain Rule', formulas: ['\\frac{d}{dx}f(g(x))=f\'(g(x))g\'(x)'], method: 'differentiate the outside function while preserving the inside, then multiply by the derivative of the inside' };
  if (t.includes('implicit')) return { area: 'implicit differentiation', formulas: ['\\frac{d}{dx}y^n=ny^{n-1}\\frac{dy}{dx}'], method: 'differentiate both sides with respect to x, attach dy/dx to y-terms, and solve for dy/dx' };
  if (t.includes('inverse')) return { area: 'inverse function differentiation', formulas: ['(f^{-1})\'(a)=\\frac{1}{f\'(f^{-1}(a))}'], method: 'connect input-output pairs of inverse functions and use reciprocal derivative relationships' };
  if (t.includes('related rates')) return { area: 'related rates', formulas: ['\\frac{dy}{dt}=\\frac{dy}{dx}\\frac{dx}{dt}'], method: 'write an equation relating changing quantities, differentiate with respect to time, then substitute known values' };
  if (t.includes('l\'hospital')) return { area: "L'Hospital's Rule", formulas: ['\\lim_{x\\to a}\\frac{f(x)}{g(x)}=\\lim_{x\\to a}\\frac{f\'(x)}{g\'(x)}'], method: 'first confirm an indeterminate form such as 0/0 or infinity/infinity, then differentiate numerator and denominator separately' };
  if (t.includes('mean value')) return { area: 'the Mean Value Theorem', formulas: ['f\'(c)=\\frac{f(b)-f(a)}{b-a}'], method: 'check continuity on the closed interval and differentiability on the open interval before claiming an average-rate equals instantaneous-rate point' };
  if (t.includes('continu')) return { area: 'continuity', formulas: ['\\lim_{x\\to a} f(x)=f(a)'], method: 'verify function value, limit existence, and equality between the two; use IVT only on closed intervals with continuity' };
  if (t.includes('limit')) return { area: 'limits and limiting behavior', formulas: ['\\lim_{x\\to a} f(x)=L'], method: 'analyze values as the input approaches a point or infinity, using graphs, tables, algebra, or the Squeeze Theorem' };
  if (t.includes('defining') && t.includes('derivative')) return { area: 'the derivative definition', formulas: ["f'(a)=\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}"], method: 'use the limit definition to represent instantaneous rate of change at a point' };
  if (t.includes('power rule')) return { area: 'the Power Rule', formulas: ['\\frac{d}{dx}x^n=nx^{n-1}'], method: 'differentiate powers of x by multiplying by the exponent and lowering the exponent by one' };
  if (t.includes('product rule')) return { area: 'the Product Rule', formulas: ['(fg)\'=f\'g+fg\''], method: 'differentiate products by differentiating one factor at a time and adding the results' };
  if (t.includes('quotient rule')) return { area: 'the Quotient Rule', formulas: ['\\left(\\frac{f}{g}\\right)\'=\\frac{f\'g-fg\'}{g^2}'], method: 'differentiate quotients using low-d-high minus high-d-low over the square of the denominator' };
  if (t.includes('derivative') || t.includes('differentiab') || t.includes('rate')) return { area: 'derivatives and rates of change', formulas: [], method: 'interpret the derivative as instantaneous rate of change, slope of a tangent line, or sensitivity in context' };
  if (t.includes('increasing') || t.includes('decreasing') || t.includes('first derivative')) return { area: 'first derivative behavior', formulas: ["f'(x)>0\\Rightarrow f\\text{ increasing}", "f'(x)<0\\Rightarrow f\\text{ decreasing}"], method: 'use the sign of the first derivative across intervals to classify increasing, decreasing, and local extrema behavior' };
  if (t.includes('concavity') || t.includes('second derivative')) return { area: 'concavity and second derivative behavior', formulas: ['f\'\'(x)>0\\Rightarrow concave\\ up', 'f\'\'(x)<0\\Rightarrow concave\\ down'], method: 'use the sign of the second derivative to classify concavity and possible inflection points' };
  if (t.includes('optimization')) return { area: 'optimization', formulas: [], method: 'define the target function, restrict the domain, find candidates, and compare values in context' };
  if (t.includes('fundamental theorem')) return { area: 'the Fundamental Theorem of Calculus', formulas: ['\\frac{d}{dx}\\int_a^x f(t)\\,dt=f(x)', '\\int_a^b f(x)\\,dx=F(b)-F(a)'], method: 'connect derivatives and integrals through accumulation functions and antiderivatives' };
  if (t.includes('riemann')) return { area: 'Riemann sums', formulas: ['\\sum f(x_i^*)\\Delta x'], method: 'approximate accumulated change by adding rectangle areas across subintervals' };
  if (t.includes('average value')) return { area: 'average value of a function', formulas: ['f_{avg}=\\frac{1}{b-a}\\int_a^b f(x)\\,dx'], method: 'divide accumulated function value by interval length' };
  if (t.includes('definite integral') || t.includes('accumulation')) return { area: 'definite integrals and accumulation', formulas: ['\\int_a^b f(x)\\,dx'], method: 'interpret signed area and accumulated change using units and interval bounds' };
  if (t.includes('antiderivative') || t.includes('substitution') || t.includes('integrating')) return { area: 'antiderivatives and integration techniques', formulas: [], method: 'select an antiderivative rule or substitution that reverses the derivative structure' };
  if (t.includes('differential equation') || t.includes('slope field') || t.includes('euler')) return { area: 'differential equations', formulas: ['\\frac{dy}{dx}=f(x,y)'], method: 'represent a relationship between a function and its derivative, then solve, approximate, or interpret the solution' };
  if (t.includes('area between')) return { area: 'area between curves', formulas: ['\\int_a^b(upper-lower)\\,dx'], method: 'identify the bounding curves, choose x- or y-slices, and integrate top-minus-bottom or right-minus-left' };
  if (t.includes('volume') || t.includes('washer') || t.includes('disc') || t.includes('cross section')) return { area: 'volumes from cross sections or rotation', formulas: ['V=\\int_a^b A(x)\\,dx'], method: 'write the cross-sectional area or washer/disc area as a function of the slicing variable' };
  if (t.includes('parametric')) return { area: 'parametric equations', formulas: ['\\frac{dy}{dx}=\\frac{dy/dt}{dx/dt}'], method: 'differentiate x(t) and y(t) with respect to the parameter and convert to dy/dx when needed' };
  if (t.includes('vector')) return { area: 'vector-valued functions', formulas: ['\\vec r(t)=\\langle x(t),y(t)\\rangle'], method: 'treat position, velocity, and acceleration component-wise and interpret motion from vector quantities' };
  if (t.includes('polar')) return { area: 'polar functions', formulas: ['A=\\frac12\\int_\\alpha^\\beta r^2\\,d\\theta'], method: 'convert polar information into area, slope, or motion relationships using r and theta' };
  if (t.includes('geometric series')) return { area: 'geometric series', formulas: ['\\sum_{n=0}^{\\infty}ar^n=\\frac{a}{1-r},\\ |r|<1'], method: 'identify first term and common ratio before deciding convergence' };
  if (t.includes('taylor') || t.includes('maclaurin')) return { area: 'Taylor and Maclaurin series', formulas: ['f(x)=\\sum_{n=0}^{\\infty}\\frac{f^{(n)}(a)}{n!}(x-a)^n'], method: 'represent a function with derivatives centered at a chosen value' };
  if (t.includes('series') || t.includes('convergen') || t.includes('power')) return { area: 'sequences, series, and power series', formulas: [], method: 'determine convergence, estimate error, or represent functions with Taylor and power series' };
  return { area: 'calculus reasoning', formulas: [], method: 'choose the relevant derivative, integral, limit, or series representation and justify it with AP-ready notation' };
}

function buildCalculusContent(topic) {
  const focus = calculusFocus(topic.title);
  return {
    description: `${topic.title} focuses on ${focus.area} and how AP Calculus expects students to justify procedures, notation, and interpretations.`,
    key_concepts: [
      `Recognize when ${topic.title} is testing ${focus.area}`,
      `Use correct calculus notation before computing`,
      `Check required conditions before applying the theorem or rule`,
      `Connect graphical, numerical, analytical, and verbal representations`,
      `Interpret the final result with units or interval meaning when context is given`
    ],
    latex_formulas: focus.formulas,
    lesson_content: `## Big Idea\n${topic.title} is about ${focus.area}. The AP exam does not reward a rule name alone; it rewards a correct setup, valid conditions, and a conclusion tied to the representation or context.\n\n## What You Must Know\nFor this topic, you should ${focus.method}. Start by identifying the target quantity and the representation given: equation, graph, table, verbal model, or differential relationship.\n\n## How AP Tests It\nAP Calculus questions may ask for a value, an approximation, a justification, or an interpretation. A complete response for ${topic.title} states the calculus idea, shows the setup with notation, performs the computation or reasoning, and explains what the answer means.\n\n## Common Mistakes\nDo not apply a theorem without checking its conditions. Avoid dropping units, mixing up average and instantaneous change, ignoring interval endpoints, or using a derivative/integral rule without explaining why it applies.`,
    cheatsheet: [
      `Topic focus: ${focus.area}`,
      `Main method: ${focus.method}`,
      `Write the setup before calculating`,
      `Check continuity, differentiability, interval, or convergence conditions when relevant`,
      `Interpret answers in context, especially rates, accumulation, area, and motion`
    ].join('\n'),
    worked_examples: [
      { problem: `A problem about ${topic.title.toLowerCase()} gives a graph, table, or formula. What should you identify first?`, solution: `Identify what quantity is being requested and which representation is provided. Then choose the matching calculus tool for ${focus.area} before doing any computation.` },
      { problem: `How should an AP free-response answer for ${topic.title.toLowerCase()} be justified?`, solution: `State the rule or theorem, show the setup using correct notation, verify needed conditions when applicable, and write a final sentence interpreting the result in the problem context.` }
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
      : courseId === 'AP_CSA'
        ? { topics: topics.map((topic) => ({ id: topic.id, ...buildCSAContent(topic) })) }
        : courseId === 'AP_CALC_AB' || courseId === 'AP_CALC_BC'
          ? { topics: topics.map((topic) => ({ id: topic.id, ...buildCalculusContent(topic) })) }
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