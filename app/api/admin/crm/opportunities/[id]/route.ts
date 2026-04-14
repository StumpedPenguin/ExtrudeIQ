import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { logActivity } from '@/lib/crm/activities';

// GET - Get a specific opportunity
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

    const { data: opportunity, error } = await client
      .from('opportunities')
      .select(
        'id, name, status, estimated_value, probability_percent, expected_close_date, description, account_id, contact_id, account_owner_id, accounts(id, name), created_at, updated_at'
      )
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .single();

    if (error) {
      console.error('Error fetching opportunity:', error);
      return NextResponse.json(
        { error: `Failed to fetch opportunity: ${error.message}` },
        { status: 400 }
      );
    }

    if (!opportunity) {
      console.error('Opportunity not found for id:', (await params).id, 'user:', authData.user.id);
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // User access is already verified by created_by filter above

    // Map account data
    const accounts_data = opportunity.accounts as any;
    const account_obj = Array.isArray(accounts_data) ? accounts_data[0] : accounts_data;
    const mappedOpportunity = {
      ...opportunity,
      account_name: account_obj?.name || '',
      account: account_obj ? { id: account_obj.id, name: account_obj.name } : null,
    };

    // Fetch contacts for the account if account_id exists
    let contacts: any[] = [];
    if (opportunity.account_id) {
      const { data: contactData } = await client
        .from('contacts')
        .select('id, first_name, last_name, email, title')
        .eq('account_id', opportunity.account_id);
      contacts = contactData || [];
    }

    return NextResponse.json({ opportunity: mappedOpportunity, contacts });
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: 500 }
    );
  }
}

// PUT - Update an opportunity
export async function PUT(
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
      status,
      estimated_value,
      probability_percent,
      expected_close_date,
      description,
      contact_id,
      account_owner_id,
    } = body;

    // Build update payload - only include contact_id/account_owner_id if explicitly provided
    const updatePayload: Record<string, any> = {};
    if (name) updatePayload.name = name;
    if (status) updatePayload.status = status;
    if (estimated_value !== undefined) updatePayload.estimated_value = estimated_value;
    if (probability_percent !== undefined) updatePayload.probability_percent = probability_percent;
    if (expected_close_date !== undefined) updatePayload.expected_close_date = expected_close_date;
    if (description !== undefined) updatePayload.description = description;
    if (contact_id !== undefined) updatePayload.contact_id = contact_id;
    if (account_owner_id !== undefined) updatePayload.account_owner_id = account_owner_id;

    const { data: opportunity, error } = await client
      .from('opportunities')
      .update(updatePayload)
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .select(
        'id, name, status, estimated_value, probability_percent, expected_close_date, description, account_id, contact_id, account_owner_id, accounts(id, name), created_at, updated_at'
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Map account data
    const accounts_put_data = opportunity.accounts as any;
    const account_obj_put = Array.isArray(accounts_put_data) ? accounts_put_data[0] : accounts_put_data;
    const mappedOpportunity = {
      ...opportunity,
      account_name: account_obj_put?.name || '',
      account: account_obj_put ? { id: account_obj_put.id, name: account_obj_put.name } : null,
    };

    if (status) {
      await logActivity(client, {
        account_id: opportunity.account_id,
        opportunity_id: opportunity.id,
        activity_type: 'opportunity_status_changed',
        title: `Opportunity status changed to ${status}`,
        description: opportunity.name,
        created_by: authData.user.id,
      });
    }

    return NextResponse.json({ opportunity: mappedOpportunity });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to update opportunity' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an opportunity
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

    // Verify user has access to this opportunity
    const { data: currentOpp, error: oppError } = await client
      .from('opportunities')
      .select('account_id')
      .eq('id', id)
      .eq('created_by', authData.user.id)
      .single();

    if (oppError || !currentOpp) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    const { error } = await client
      .from('opportunities')
      .delete()
      .eq('id', id)
      .eq('created_by', authData.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: 500 }
    );
  }
}

// PATCH - Alias for PUT
export { PUT as PATCH };
