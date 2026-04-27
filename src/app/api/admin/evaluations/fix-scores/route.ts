import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Fix/recalculate evaluation scores
export async function POST(request: NextRequest) {
  try {
    const { evaluationId } = await request.json();

    if (evaluationId) {
      // Fix specific evaluation
      const evaluation = await db.evaluation.findUnique({
        where: { id: evaluationId }
      });

      if (!evaluation) {
        return NextResponse.json(
          { error: 'Evaluation not found' },
          { status: 404 }
        );
      }

      const ratings = JSON.parse(evaluation.ratings || '[]');
      const totalScore = ratings.reduce((sum: number, r: any) => sum + (r.rating || r.score || 0), 0);

      await db.evaluation.update({
        where: { id: evaluationId },
        data: { totalScore }
      });

      return NextResponse.json({
        success: true,
        message: 'Score recalculated successfully',
        oldScore: evaluation.totalScore,
        newScore: totalScore
      });
    }

    // Fix all evaluations
    const evaluations = await db.evaluation.findMany();
    let updated = 0;

    for (const evaluation of evaluations) {
      const ratings = JSON.parse(evaluation.ratings || '[]');
      const totalScore = ratings.reduce((sum: number, r: any) => sum + (r.rating || r.score || 0), 0);

      if (evaluation.totalScore !== totalScore) {
        await db.evaluation.update({
          where: { id: evaluation.id },
          data: { totalScore }
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated scores for ${updated} evaluations`,
      updated
    });

  } catch (error: any) {
    console.error('Fix scores error:', error);
    return NextResponse.json(
      { error: 'Failed to fix scores' },
      { status: 500 }
    );
  }
}
