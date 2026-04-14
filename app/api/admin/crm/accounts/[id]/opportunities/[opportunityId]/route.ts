import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// PATCH - Update an opportunity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; opportunityId: string }> }
) {
  try {
    const { id, opportunityId } = await params;
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

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

    // Update the opportunity
    const { data: opportunity, error } = await client
      .from('opportunities')
      .update({
        ...body,
        last_activity_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .eq('account_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an opportunity
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; opportunityId: string }> }
) {
  try {
    const { id, opportunityId } = await params;
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await client
      .from('opportunities')
      .delete()
      .eq('id', opportunityId)
      .eq('account_id', id);

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
