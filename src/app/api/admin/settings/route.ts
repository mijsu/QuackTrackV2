import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch system settings
export async function GET() {
  try {
    const settings = await db.settings.findFirst();

    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          evaluationOpen: true,
          currentSemester: '1st Semester',
          currentSchoolYear: '2024-2025'
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Update settings
export async function POST(request: NextRequest) {
  try {
    const { evaluationOpen, currentSemester, currentSchoolYear } = await request.json();

    const settingsData = {
      evaluationOpen: evaluationOpen !== undefined ? evaluationOpen : true,
      currentSemester: currentSemester || '1st Semester',
      currentSchoolYear: currentSchoolYear || '2024-2025'
    };

    // Check if settings exist
    const existingSettings = await db.settings.findFirst();

    if (existingSettings) {
      await db.settings.update({
        where: { id: existingSettings.id },
        data: settingsData
      });
    } else {
      await db.settings.create({
        data: settingsData
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: settingsData
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
