import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/schedule-versions/compare?versionId1=...&versionId2=...
// Compare two schedule versions and return the diff
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const versionId1 = searchParams.get('versionId1');
    const versionId2 = searchParams.get('versionId2');

    if (!versionId1 || !versionId2) {
      return NextResponse.json(
        { error: 'Both versionId1 and versionId2 query parameters are required' },
        { status: 400 }
      );
    }

    if (versionId1 === versionId2) {
      return NextResponse.json(
        { error: 'Cannot compare the same version with itself' },
        { status: 400 }
      );
    }

    // Fetch both versions with their snapshots
    const [version1, version2] = await Promise.all([
      db.scheduleVersion.findUnique({
        where: { id: versionId1 },
        include: {
          snapshots: {
            orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
          },
        },
      }),
      db.scheduleVersion.findUnique({
        where: { id: versionId2 },
        include: {
          snapshots: {
            orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
          },
        },
      }),
    ]);

    if (!version1) {
      return NextResponse.json({ error: 'Version 1 not found' }, { status: 404 });
    }
    if (!version2) {
      return NextResponse.json({ error: 'Version 2 not found' }, { status: 404 });
    }

    // Parse JSON fields in snapshots
    const snapshots1 = version1.snapshots.map(s => ({
      ...s,
      scoreBreakdown: s.scoreBreakdown ? JSON.parse(s.scoreBreakdown) : null,
    }));
    const snapshots2 = version2.snapshots.map(s => ({
      ...s,
      scoreBreakdown: s.scoreBreakdown ? JSON.parse(s.scoreBreakdown) : null,
    }));

    // Create a key for each snapshot based on subject+faculty+section+room+day+time
    // This is used to match schedules across versions
    const makeKey = (s: typeof snapshots1[number]) =>
      `${s.subjectId}|${s.facultyId}|${s.sectionId}|${s.roomId}|${s.day}|${s.startTime}|${s.endTime}`;

    const map1 = new Map(snapshots1.map(s => [makeKey(s), s]));
    const map2 = new Map(snapshots2.map(s => [makeKey(s), s]));

    // Build the diff
    interface DiffEntry {
      status: 'added' | 'removed' | 'modified' | 'unchanged';
      snapshot: typeof snapshots1[number];
      previousSnapshot?: typeof snapshots1[number] | null;
      key: string;
      changes?: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
      }[];
    }

    const diffs: DiffEntry[] = [];

    // Check snapshots in version 2 (the newer one)
    for (const snapshot of snapshots2) {
      const key = makeKey(snapshot);
      const inV1 = map1.get(key);

      if (!inV1) {
        // Not an exact match - check if it's a modified entry (same subject+section+faculty but different time/room)
        const partialKey = `${snapshot.subjectId}|${snapshot.facultyId}|${snapshot.sectionId}`;
        const partialMatches = [...map1.entries()].filter(
          ([k]) => k.startsWith(partialKey) && k !== key
        );

        if (partialMatches.length > 0) {
          // Use the first partial match as the "previous" version
          const [prevKey, prevSnapshot] = partialMatches[0];
          const changes: DiffEntry['changes'] = [];

          if (prevSnapshot.roomId !== snapshot.roomId) {
            changes.push({
              field: 'Room',
              oldValue: prevSnapshot.roomName,
              newValue: snapshot.roomName,
            });
          }
          if (prevSnapshot.day !== snapshot.day) {
            changes.push({
              field: 'Day',
              oldValue: prevSnapshot.day,
              newValue: snapshot.day,
            });
          }
          if (prevSnapshot.startTime !== snapshot.startTime) {
            changes.push({
              field: 'Start Time',
              oldValue: prevSnapshot.startTime,
              newValue: snapshot.startTime,
            });
          }
          if (prevSnapshot.endTime !== snapshot.endTime) {
            changes.push({
              field: 'End Time',
              oldValue: prevSnapshot.endTime,
              newValue: snapshot.endTime,
            });
          }
          if (prevSnapshot.status !== snapshot.status) {
            changes.push({
              field: 'Status',
              oldValue: prevSnapshot.status,
              newValue: snapshot.status,
            });
          }

          diffs.push({
            status: 'modified',
            snapshot,
            previousSnapshot: prevSnapshot,
            key: prevKey,
            changes,
          });
          // Remove from map1 to avoid counting as removed later
          map1.delete(prevKey);
        } else {
          // Completely new entry
          diffs.push({
            status: 'added',
            snapshot,
            previousSnapshot: null,
            key,
          });
        }
      } else {
        // Exact match - unchanged
        diffs.push({
          status: 'unchanged',
          snapshot,
          previousSnapshot: inV1,
          key,
        });
        // Remove from map1 to mark as processed
        map1.delete(key);
      }
    }

    // Remaining entries in map1 are removed in version 2
    for (const [key, snapshot] of map1) {
      diffs.push({
        status: 'removed',
        snapshot,
        previousSnapshot: null,
        key,
      });
    }

    // Sort diffs: removed first, then modified, then added, then unchanged
    const statusOrder = { removed: 0, modified: 1, added: 2, unchanged: 3 };
    diffs.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    // Compute summary
    const summary = {
      totalChanges: diffs.filter(d => d.status !== 'unchanged').length,
      added: diffs.filter(d => d.status === 'added').length,
      removed: diffs.filter(d => d.status === 'removed').length,
      modified: diffs.filter(d => d.status === 'modified').length,
      unchanged: diffs.filter(d => d.status === 'unchanged').length,
      totalV1: snapshots1.length,
      totalV2: snapshots2.length,
    };

    return NextResponse.json({
      version1: {
        id: version1.id,
        versionName: version1.versionName,
        description: version1.description,
        semester: version1.semester,
        academicYear: version1.academicYear,
        generatedAt: version1.generatedAt,
        scheduleCount: version1.scheduleCount,
        isActive: version1.isActive,
        stats: JSON.parse(version1.stats || '{}'),
      },
      version2: {
        id: version2.id,
        versionName: version2.versionName,
        description: version2.description,
        semester: version2.semester,
        academicYear: version2.academicYear,
        generatedAt: version2.generatedAt,
        scheduleCount: version2.scheduleCount,
        isActive: version2.isActive,
        stats: JSON.parse(version2.stats || '{}'),
      },
      diffs,
      summary,
    });
  } catch (error) {
    console.error('Error comparing schedule versions:', error);
    return NextResponse.json({ error: 'Failed to compare versions' }, { status: 500 });
  }
}
