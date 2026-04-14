import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { logActivity } from '@/lib/crm/activities';

// GET - List all opportunities for an account
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    // Verify account exists and belongs to user
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('id')
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 403 }
      );
    }

    let query = client
      .from('opportunities')
      .select('*', { count: 'exact' })
      .eq('account_id', id);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination and ordering
    const { data: opportunities, count, error } = await query
      .order('expected_close_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      opportunities,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new opportunity for an account
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      status = 'prospecting',
      estimated_value,
      probability_percent = 50,
      expected_close_date,
      next_step,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Verify account exists and belongs to user
    const { data: account } = await client
      .from('accounts')
      .select('id')
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const { data: opportunity, error } = await client
      .from('opportunities')
      .insert({
        account_id: id,
        name,
        description: description || null,
        status,
        estimated_value: estimated_value || null,
        probability_percent,
        expected_close_date: expected_close_date || null,
        next_step: next_step || null,
        created_by: authData.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(client, {
      account_id: id,
      opportunity_id: opportunity.id,
      activity_type: 'opportunity_created',
      title: `Opportunity created: ${opportunity.name}`,
      created_by: authData.user.id,
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
