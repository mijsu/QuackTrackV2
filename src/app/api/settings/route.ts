import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Default settings
const defaultSettings = {
  institution_name: 'Pateros Technological College',
  institution_code: 'PTC',
  max_faculty_units: '24',
  min_faculty_units: '12',
  academic_year: '2024-2025',
  semester: '1st Semester',
  semester_start_date: '',
  semester_end_date: '',
  default_class_duration: '60',
  min_class_start_time: '07:00',
  max_class_end_time: '21:00',
  auto_assign_rooms: 'false',
  prefer_consecutive_slots: 'false',
  auto_generate_enabled: 'true',
  conflict_detection_enabled: 'true',
  email_notifications: 'true',
  schedule_reminders: 'true',
  conflict_notification_threshold: '5',
  maintenance_mode: 'false',
  maintenance_message: '',
  allow_faculty_self_registration: 'false',
  last_backup: '',
};

// GET /api/settings - Get system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all settings
    const settings = await db.systemSetting.findMany();
    
    // Convert to object
    const settingsMap: Record<string, string> = { ...defaultSettings };
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/settings - Update system settings (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update settings
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate settings
    const allowedKeys = [
      'institution_name',
      'institution_code', 
      'max_faculty_units',
      'min_faculty_units',
      'academic_year',
      'semester',
      'semester_start_date',
      'semester_end_date',
      'default_class_duration',
      'min_class_start_time',
      'max_class_end_time',
      'auto_assign_rooms',
      'prefer_consecutive_slots',
      'auto_generate_enabled',
      'conflict_detection_enabled',
      'email_notifications',
      'schedule_reminders',
      'conflict_notification_threshold',
      'maintenance_mode',
      'maintenance_message',
      'allow_faculty_self_registration',
      'last_backup',
    ];

    // Update each setting
    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key)) {
        await db.systemSetting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update_settings',
        entity: 'systemSetting',
        details: JSON.stringify(body),
      },
    });

    // Fetch updated settings
    const settings = await db.systemSetting.findMany();
    const settingsMap: Record<string, string> = { ...defaultSettings };
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings: settingsMap 
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
