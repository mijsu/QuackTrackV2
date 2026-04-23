import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { SPECIALIZATION_OPTIONS } from '@/types';

const SETTINGS_KEY = 'specialization_options';

/**
 * Get the current list of specializations from the database.
 * If no setting exists yet, auto-seed from SPECIALIZATION_OPTIONS defaults.
 */
async function getOrCreateSpecializations(): Promise<string[]> {
  const setting = await db.systemSetting.findUnique({
    where: { key: SETTINGS_KEY },
  });

  if (setting) {
    try {
      return JSON.parse(setting.value);
    } catch {
      return [...SPECIALIZATION_OPTIONS];
    }
  }

  // No setting exists yet — seed from defaults
  await db.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: {},
    create: {
      key: SETTINGS_KEY,
      value: JSON.stringify(SPECIALIZATION_OPTIONS),
      description: 'All active specializations managed by administrators',
      category: 'scheduling',
    },
  });

  return [...SPECIALIZATION_OPTIONS];
}

/**
 * Save the full list of specializations to the database.
 */
async function saveSpecializations(specs: string[]): Promise<void> {
  await db.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(specs) },
    create: {
      key: SETTINGS_KEY,
      value: JSON.stringify(specs),
      description: 'All active specializations managed by administrators',
      category: 'scheduling',
    },
  });
}

// GET /api/specializations - Fetch all specializations
export async function GET() {
  try {
    const specializations = await getOrCreateSpecializations();

    return NextResponse.json({
      specializations,
      defaultSpecializations: SPECIALIZATION_OPTIONS,
    });
  } catch (error) {
    console.error('Error fetching specializations:', error);
    return NextResponse.json({
      specializations: SPECIALIZATION_OPTIONS,
      defaultSpecializations: SPECIALIZATION_OPTIONS,
    });
  }
}

// POST /api/specializations - Add a new specialization (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Specialization name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const currentSpecs = await getOrCreateSpecializations();

    // Check for duplicates (case-insensitive)
    if (currentSpecs.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
      return NextResponse.json({ error: 'This specialization already exists' }, { status: 409 });
    }

    // Add the new specialization
    currentSpecs.push(trimmedName);
    await saveSpecializations(currentSpecs);

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'specialization',
        canUndo: true,
        details: JSON.stringify({ name: trimmedName }),
      },
    });

    return NextResponse.json({
      specializations: currentSpecs,
      added: trimmedName,
    });
  } catch (error) {
    console.error('Error adding specialization:', error);
    return NextResponse.json({ error: 'Failed to add specialization' }, { status: 500 });
  }
}

// DELETE /api/specializations - Remove any specialization (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Specialization name is required' }, { status: 400 });
    }

    const currentSpecs = await getOrCreateSpecializations();

    // Find and remove the specialization
    const index = currentSpecs.findIndex(s => s === name);
    if (index === -1) {
      return NextResponse.json({ error: 'Specialization not found' }, { status: 404 });
    }

    currentSpecs.splice(index, 1);
    await saveSpecializations(currentSpecs);

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'specialization',
        canUndo: true,
        details: JSON.stringify({ name }),
      },
    });

    return NextResponse.json({
      specializations: currentSpecs,
      deleted: name,
    });
  } catch (error) {
    console.error('Error deleting specialization:', error);
    return NextResponse.json({ error: 'Failed to delete specialization' }, { status: 500 });
  }
}

// PUT /api/specializations - Rename a specialization (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { oldName, newName } = body;

    if (!oldName || typeof oldName !== 'string') {
      return NextResponse.json({ error: 'Old specialization name is required' }, { status: 400 });
    }
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return NextResponse.json({ error: 'New specialization name is required' }, { status: 400 });
    }

    const trimmedNewName = newName.trim();
    const currentSpecs = await getOrCreateSpecializations();

    // Find the old name
    const index = currentSpecs.findIndex(s => s === oldName);
    if (index === -1) {
      return NextResponse.json({ error: 'Specialization not found' }, { status: 404 });
    }

    // Check for duplicates with the new name (excluding the current one)
    if (currentSpecs.some(s => s !== oldName && s.toLowerCase() === trimmedNewName.toLowerCase())) {
      return NextResponse.json({ error: 'A specialization with this name already exists' }, { status: 409 });
    }

    const oldSpecName = currentSpecs[index];
    currentSpecs[index] = trimmedNewName;
    await saveSpecializations(currentSpecs);

    // Also update any users who have this specialization
    const users = await db.user.findMany();
    for (const user of users) {
      try {
        const specs: string[] = JSON.parse(user.specialization || '[]');
        const specIndex = specs.indexOf(oldSpecName);
        if (specIndex !== -1) {
          specs[specIndex] = trimmedNewName;
          await db.user.update({
            where: { id: user.id },
            data: { specialization: JSON.stringify(specs) },
          });
        }
      } catch {
        // Skip users with invalid specialization data
      }
    }

    // Also update any subjects that require this specialization
    const subjects = await db.subject.findMany();
    for (const subject of subjects) {
      try {
        const reqSpecs: string[] = JSON.parse(subject.requiredSpecialization || '[]');
        const specIndex = reqSpecs.indexOf(oldSpecName);
        if (specIndex !== -1) {
          reqSpecs[specIndex] = trimmedNewName;
          await db.subject.update({
            where: { id: subject.id },
            data: { requiredSpecialization: JSON.stringify(reqSpecs) },
          });
        }
      } catch {
        // Skip subjects with invalid data
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'specialization',
        canUndo: true,
        details: JSON.stringify({ oldName: oldSpecName, newName: trimmedNewName }),
      },
    });

    return NextResponse.json({
      specializations: currentSpecs,
      renamed: { from: oldSpecName, to: trimmedNewName },
    });
  } catch (error) {
    console.error('Error renaming specialization:', error);
    return NextResponse.json({ error: 'Failed to rename specialization' }, { status: 500 });
  }
}
