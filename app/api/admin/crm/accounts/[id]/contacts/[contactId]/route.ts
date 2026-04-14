import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// PATCH - Update a contact
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Verify contact exists and belongs to user's account
    const { data: contact } = await client
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('account_id', id)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Update the contact
    const { data: updated, error } = await client
      .from('contacts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contact
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await client
      .from('contacts')
      .delete()
      .eq('id', contactId)
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
