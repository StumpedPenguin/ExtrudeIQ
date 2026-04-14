import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET - Fetch a specific account with related data
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

    // Fetch account
    const { data: account, error } = await client
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Fetch related contacts
    const { data: contacts } = await client
      .from('contacts')
      .select('*')
      .eq('account_id', id);

    // Fetch related opportunities
    const { data: opportunities } = await client
      .from('opportunities')
      .select('*')
      .eq('account_id', id);

    // Fetch related quotes
    const { data: quotes } = await client
      .from('quotes')
      .select('*')
      .eq('account_id', id);

    return NextResponse.json({
      account,
      contacts: contacts || [],
      opportunities: opportunities || [],
      quotes: quotes || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update an account
export async function PATCH(
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

    // Update the account
    const { data: account, error } = await client
      .from('accounts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an account
export async function DELETE(
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

    const { error } = await client
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('created_by', authData.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
