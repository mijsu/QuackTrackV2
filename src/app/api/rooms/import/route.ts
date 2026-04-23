import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/rooms/import
 *
 * Bulk import rooms from CSV data.
 *
 * Expected columns (case-insensitive):
 *   RoomName (required), Building, Capacity, Type, Floor, Equipment
 *
 * Body: { records: Record<string, string>[] }
 */
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
    const records: Record<string, string>[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    if (records.length > 200) {
      return NextResponse.json(
        { error: 'Too many records. Maximum 200 records per import.' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      try {
        // Map CSV columns (case-insensitive matching)
        const roomName = row['RoomName'] || row['roomName'] || '';
        const building = row['Building'] || row['building'] || 'Main Building';
        const rawCapacity = row['Capacity'] || row['capacity'] || '30';
        const type = row['Type'] || row['type'] || 'lecture';
        const rawFloor = row['Floor'] || row['floor'] || '1';
        const equipment = row['Equipment'] || row['equipment'] || '';

        // Validate required fields
        if (!roomName.trim()) {
          errorCount++;
          errors.push({ row: rowNum, message: 'RoomName is required' });
          continue;
        }

        // Check if room name already exists
        const existingRoom = await db.room.findUnique({
          where: { roomName: roomName.trim() },
        });
        if (existingRoom) {
          errorCount++;
          errors.push({
            row: rowNum,
            message: `Room name "${roomName}" already exists`,
          });
          continue;
        }

        // Parse capacity
        const parsedCapacity = parseInt(rawCapacity, 10);
        const capacity = isNaN(parsedCapacity) || parsedCapacity < 1 ? 30 : parsedCapacity;

        // Parse floor
        const parsedFloor = parseInt(rawFloor, 10);
        const floor = isNaN(parsedFloor) || parsedFloor < 1 ? 1 : parsedFloor;

        // Normalize type to lowercase
        const normalizedType = type.toLowerCase().trim();

        // Parse equipment: comma-separated list stored as JSON string
        const equipmentList = equipment
          .split(/[;,|]/)
          .map((e) => e.trim())
          .filter(Boolean);

        // If type is specified, add type-specific equipment if not already present
        if (normalizedType === 'laboratory' || normalizedType === 'lab') {
          if (!equipmentList.some((e) => e.toLowerCase().includes('lab'))) {
            equipmentList.push('Laboratory Equipment');
          }
        } else if (normalizedType === 'computer') {
          if (!equipmentList.some((e) => e.toLowerCase().includes('computer'))) {
            equipmentList.push('Computers');
          }
          if (!equipmentList.some((e) => e.toLowerCase().includes('software'))) {
            equipmentList.push('Software');
          }
        }

        // Create the room
        await db.room.create({
          data: {
            roomName: roomName.trim(),
            capacity,
            building: building.trim() || 'Main Building',
            floor,
            equipment: JSON.stringify(equipmentList),
            isActive: true,
          },
        });

        successCount++;
      } catch (err) {
        errorCount++;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: rowNum, message: msg });
      }
    }

    // Create audit log for the import
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'import',
        entity: 'room',
        details: JSON.stringify({
          source: 'csv',
          total: records.length,
          success: successCount,
          errors: errorCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      imported: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${successCount} room${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
    });
  } catch (error) {
    console.error('Rooms import error:', error);
    return NextResponse.json(
      { error: 'Failed to import rooms' },
      { status: 500 }
    );
  }
}
