import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET - List all leads with pagination and filters
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = client
      .from('leads')
      .select('*', { count: 'exact' });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Search by company name or contact info
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,primary_contact_name.ilike.%${search}%,primary_contact_email.ilike.%${search}%`);
    }

    // Filter by user's leads
    query = query.eq('created_by', authData.user.id);

    // Apply pagination and ordering
    const { data: leads, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      leads,
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

// POST - Create a new lead
export async function POST(req: Request) {
  try {
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      company_name,
      industry,
      website,
      lead_source,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
    } = body;

    // Validate required fields
    if (!company_name) {
      return NextResponse.json(
        { error: 'company_name is required' },
        { status: 400 }
      );
    }

    const { data: lead, error } = await client.from('leads').insert({
      company_name,
      industry: industry || null,
      website: website || null,
      lead_source: lead_source || null,
      primary_contact_name: primary_contact_name || null,
      primary_contact_email: primary_contact_email || null,
      primary_contact_phone: primary_contact_phone || null,
      status: 'new',
      score: 0,
      created_by: authData.user.id,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
