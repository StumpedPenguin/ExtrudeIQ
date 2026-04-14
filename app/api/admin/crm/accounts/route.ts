import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET - List all accounts with pagination and filters
export async function GET(req: Request) {
  try {
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = client
      .from('accounts')
      .select('*', { count: 'exact' });

    // Filter by account type if provided
    if (type) {
      query = query.eq('type', type);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Search by company name or website
    if (search) {
      query = query.or(`name.ilike.%${search}%,website.ilike.%${search}%`);
    }

    // Filter by user's accounts
    query = query.eq('created_by', authData.user.id);

    // Apply pagination and ordering
    const { data: accounts, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      accounts,
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

// POST - Create a new account
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
      type = 'prospect',
      website,
      phone,
      industry,
      annual_revenue,
      account_owner_id,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const { data: account, error } = await client
      .from('accounts')
      .insert({
        name,
        type,
        website: website || null,
        phone: phone || null,
        industry: industry || null,
        annual_revenue: annual_revenue || null,
        account_owner_id: account_owner_id || null,
        status: 'active',
        created_by: authData.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
