import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { logActivity } from '@/lib/crm/activities';

// GET - List all contacts for an account
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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = client
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('account_id', id);

    // Search by name or email
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Apply pagination and ordering
    const { data: contacts, count, error } = await query
      .order('first_name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      contacts,
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

// POST - Create a new contact for an account
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
      first_name,
      last_name,
      email,
      phone,
      title,
      is_primary = false,
      is_decision_maker = false,
    } = body;

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'first_name and last_name are required' },
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

    const { data: contact, error } = await client
      .from('contacts')
      .insert({
        account_id: id,
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        title: title || null,
        is_primary,
        is_decision_maker,
        created_by: authData.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(client, {
      account_id: id,
      activity_type: 'contact_added',
      title: `Contact added: ${contact.first_name} ${contact.last_name}`,
      created_by: authData.user.id,
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
