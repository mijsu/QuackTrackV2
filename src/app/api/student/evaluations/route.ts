import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { studentId, subjectId, facultyId, ratings, totalScore, semester, schoolYear } = await request.json();

    if (!studentId || !subjectId || !facultyId || !ratings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if evaluation already exists
    const existingEvaluation = await db.evaluation.findFirst({
      where: {
        studentId,
        subjectId
      }
    });

    if (existingEvaluation) {
      return NextResponse.json(
        { error: 'Evaluation already submitted for this subject' },
        { status: 400 }
      );
    }

    // Create evaluation
    await db.evaluation.create({
      data: {
        studentId,
        subjectId,
        facultyId,
        ratings: JSON.stringify(ratings),
        totalScore: totalScore || 0,
        semester: semester || '1st Semester',
        schoolYear: schoolYear || '2024-2025'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Evaluation submitted successfully'
    });
  } catch (error: any) {
    console.error('Submit evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to submit evaluation' },
      { status: 500 }
    );
  }
}
