import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AUTOMATION_TOKEN = 'hf-enrich-v2-8f3k2m9xq7';
const CONTENT_VERSION = 2;

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
    const courseId = body.course_id || null;

    const units = await base44.asServiceRole.entities.Unit.list('created_date', 500);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const allTopics = await base44.asServiceRole.entities.Topic.list('created_date', 1000);

    const pendingAll = allTopics.filter((topic) =>
      (!courseId || topic.course_id === courseId) && topic.content_version !== CONTENT_VERSION
    );
    const pending = pendingAll
      .sort((a, b) => `${a.course_id}-${String(a.topic_number).padStart(8, '0')}`.localeCompare(`${b.course_id}-${String(b.topic_number).padStart(8, '0')}`))
      .slice(0, limit)
      .map((topic) => ({ ...topic, unit_title: unitById.get(topic.unit_id)?.title || '' }));

    if (pending.length === 0) {
      return Response.json({ enriched: 0, remaining: 0 });
    }

    const startTime = Date.now();
    const TIME_BUDGET_MS = 85000;
    let enriched = 0;

    for (const topic of pending) {
      if (enriched > 0 && Date.now() - startTime > TIME_BUDGET_MS) break;

      const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `You are an experienced AP teacher and exam reader writing REAL course content aligned to the official College Board Course and Exam Description (CED). You know the CED topic numbering, learning objectives, essential knowledge statements, and how each topic is actually assessed on the AP exam.

Write substantive, topic-specific teaching content for this topic. Every sentence must be specific to this exact CED topic — never reusable boilerplate that could describe another topic.

TOPIC: ${COURSE_NAMES[topic.course_id] || topic.course_id} | Unit: ${topic.unit_title} | Topic ${topic.topic_number}: ${topic.title}

Return:
- description: 1-2 sentences describing exactly what this CED topic covers and its learning objective.
- key_concepts: 5-7 concrete, topic-specific facts/skills (name actual theorems, rules, quantities, vocabulary, code constructs — with real detail, e.g. "The IVT requires f continuous on [a,b]" not "understand the theorem").
- latex_formulas: the actual formulas/definitions for this topic as raw LaTeX WITHOUT dollar-sign delimiters (e.g. "\\\\frac{d}{dx}\\\\sin x = \\\\cos x"). Include 2-6 for math/physics/stats topics. For CS topics use short code signatures or notation instead (e.g. "int[] arr = new int[10]"), or [] if nothing fits.
- lesson_content: a thorough teaching text of 300-500 words in markdown with these exact section headers: "## The Big Idea", "## Key Definitions and Rules", "## How It Works", "## AP Exam Strategy", "## Common Mistakes". Embed ALL math as inline LaTeX between single dollar signs (e.g. $f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}$) or display LaTeX between double dollar signs. Use real numbers, real function examples, real physical scenarios, or real code — never vague descriptions.
- cheatsheet: 5-8 newline-separated exam-day reminders specific to this topic, each with concrete content (include the key formula or condition in LaTeX $...$ where relevant).
- worked_examples: exactly 2 examples in genuine AP exam style. Each problem uses concrete numbers/functions/scenarios (like real released AP questions). Each solution shows the complete step-by-step work with LaTeX math in $...$ or $$...$$, ending with the final answer. Solutions must be fully worked, not descriptions of what to do.

Return JSON only.`,
        response_json_schema: {
          type: 'object',
          properties: {
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
          required: ['description', 'key_concepts', 'latex_formulas', 'lesson_content', 'cheatsheet', 'worked_examples']
        }
      });

      if (!generated || !generated.lesson_content) continue;

      await base44.asServiceRole.entities.Topic.update(topic.id, {
        description: generated.description,
        key_concepts: generated.key_concepts,
        latex_formulas: generated.latex_formulas,
        lesson_content: generated.lesson_content,
        cheatsheet: generated.cheatsheet,
        worked_examples: generated.worked_examples,
        content_version: CONTENT_VERSION
      });
      enriched += 1;
    }

    return Response.json({ enriched, remaining: Math.max(pendingAll.length - enriched, 0) });
  } catch (error) {
    console.error('enrichCourseContent error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});