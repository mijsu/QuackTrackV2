import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/generation-configs - List all generation configs/presets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isPreset = searchParams.get('isPreset');

    const configs = await db.generationConfig.findMany({
      where: isPreset === 'true' ? { isPreset: true } : undefined,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Parse JSON fields
    const parsedConfigs = configs.map(c => ({
      ...c,
      weights: JSON.parse(c.weights || '{}'),
      options: JSON.parse(c.options || '{}'),
    }));

    return NextResponse.json(parsedConfigs);
  } catch (error) {
    console.error('Error fetching generation configs:', error);
    return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 });
  }
}

// POST /api/generation-configs - Create a new config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, weights, options, isPreset, isDefault } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.generationConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await db.generationConfig.create({
      data: {
        name,
        description,
        weights: JSON.stringify(weights || {}),
        options: JSON.stringify(options || {}),
        isPreset: isPreset || false,
        isDefault: isDefault || false,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      ...config,
      weights: JSON.parse(config.weights),
      options: JSON.parse(config.options),
    });
  } catch (error) {
    console.error('Error creating generation config:', error);
    return NextResponse.json({ error: 'Failed to create config' }, { status: 500 });
  }
}
