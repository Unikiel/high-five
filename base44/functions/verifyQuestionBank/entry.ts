import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { verifyQuestions } from '../../shared/questionChecks.ts';

const MAX_PER_RUN = 96;

// Re-solves multiple-choice questions that have not been checked yet. A question whose key
// survives is marked verified; one that does not is hidden from exams with a note saying why.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 48), MAX_PER_RUN);
    const Question = base44.asServiceRole.entities.Question;
    const unchecked = { type: 'multiple_choice', is_active: { $ne: false }, verified: { $ne: true } };

    // { ids: [...] } re-checks specific questions; otherwise the oldest unchecked ones are taken.
    const query = Array.isArray(body.ids) ? { id: { $in: body.ids } } : unchecked;
    const questions = await Question.filter(query, 'created_date', limit);
    if (questions.length === 0) return Response.json({ checked: 0, remaining: 0 });

    const verdicts = await verifyQuestions(base44, questions);
    const changes = [];
    questions.forEach((question, index) => {
      const verdict = verdicts[index];
      if (!verdict) return;
      changes.push(
        verdict.ok
          ? { id: question.id, verified: true }
          : { id: question.id, is_active: false, review_note: verdict.note },
      );
    });
    if (changes.length > 0) await Question.bulkUpdate(changes);

    const hidden = changes.filter((change) => change.is_active === false).length;
    return Response.json({
      checked: changes.length,
      verified: changes.length - hidden,
      hidden,
      remaining: await Question.count(unchecked),
    });
  } catch (error) {
    console.error('verifyQuestionBank error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}