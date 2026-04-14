import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET - List all opportunities
export async function GET(req: Request) {
  try {
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const accountId = searchParams.get('account_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = client
      .from('opportunities')
      .select(
        'id, name, status, estimated_value, probability_percent, expected_close_date, account_id, accounts(id, name)',
        { count: 'exact' }
      );

    // Filter by account if provided
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Only show opportunities from accounts owned by user
    const { data: userAccounts } = await client
      .from('accounts')
      .select('id')
      .eq('created_by', authData.user.id);

    const accountIds = userAccounts?.map((a) => a.id) || [];

    // Apply pagination and ordering
    const { data: opportunities, count, error } = await query
      .in(
        'account_id',
        accountIds.length > 0 ? accountIds : ['00000000-0000-0000-0000-000000000000']
      )
      .order('expected_close_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Map account data
    const mappedOpportunities = opportunities?.map((opp: any) => ({
      ...opp,
      account_name: opp.accounts?.name,
    }));

    return NextResponse.json({
      opportunities: mappedOpportunities || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('Error listing opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to list opportunities' },
      { status: 500 }
    );
  }
}

// POST - Create a new opportunity
export async function POST(req: Request) {
  try {
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      status,
      estimated_value,
      probability_percent,
      expected_close_date,
      description,
      account_id,
    } = body;

    // Validate required fields
    if (!name || !account_id) {
      return NextResponse.json(
        { error: 'Name and account_id are required' },
        { status: 400 }
      );
    }

    // Verify account exists and belongs to user
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('created_by', authData.user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 403 }
      );
    }

    // Create opportunity
    const { data: opportunity, error } = await client
      .from('opportunities')
      .insert({
        name,
        status: status || 'prospecting',
        estimated_value: estimated_value || 0,
        probability_percent: probability_percent || 50,
        expected_close_date: expected_close_date || null,
        description: description || null,
        account_id,
        created_by: authData.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create opportunity' },
      { status: 500 }
    );
  }
}
