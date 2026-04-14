import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { logActivity } from '@/lib/crm/activities';

// POST - Convert a lead to an account + primary contact + optional opportunity
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
      account_name,
      account_type = 'prospect',
      website,
      phone,
      industry,
      account_owner_id,
      // Contact fields (can override lead's primary_contact_*)
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      contact_title,
      // Optional opportunity creation
      create_opportunity = false,
      opportunity_name,
      opportunity_value,
      opportunity_close_date,
    } = body;

    // Fetch the lead to verify it exists
    const { data: lead, error: leadError } = await client
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Create the account
    const { data: account, error: accountError } = await client
      .from('accounts')
      .insert({
        name: account_name || lead.company_name,
        type: account_type,
        website: website || lead.website || null,
        phone: phone || null,
        industry: industry || lead.industry || null,
        source_lead_id: id,
        account_owner_id: account_owner_id || null,
        created_by: authData.user.id,
      })
      .select()
      .single();

    if (accountError) {
      return NextResponse.json(
        { error: accountError.message },
        { status: 400 }
      );
    }

    // Auto-create primary contact from lead's primary_contact_* fields
    let contact = null;
    const firstName = contact_first_name || lead.primary_contact_name?.split(' ')[0] || '';
    const lastName = contact_last_name || lead.primary_contact_name?.split(' ').slice(1).join(' ') || '';

    if (firstName && lastName) {
      const { data: newContact, error: contactError } = await client
        .from('contacts')
        .insert({
          account_id: account.id,
          first_name: firstName,
          last_name: lastName,
          email: contact_email || lead.primary_contact_email || null,
          phone: contact_phone || lead.primary_contact_phone || null,
          title: contact_title || null,
          is_primary: true,
          is_decision_maker: false,
          created_by: authData.user.id,
        })
        .select()
        .single();

      if (!contactError) {
        contact = newContact;
      }
    }

    // Optionally create an initial opportunity
    let opportunity = null;
    if (create_opportunity && opportunity_name) {
      const { data: newOpp, error: oppError } = await client
        .from('opportunities')
        .insert({
          account_id: account.id,
          name: opportunity_name,
          status: 'prospecting',
          estimated_value: opportunity_value || null,
          expected_close_date: opportunity_close_date || null,
          probability_percent: 20,
          created_by: authData.user.id,
        })
        .select()
        .single();

      if (!oppError) {
        opportunity = newOpp;
      }
    }

    // Update the lead status and link to account
    const { error: updateError } = await client
      .from('leads')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        converted_to_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // Log activity
    await logActivity(client as any, {
      account_id: account.id,
      opportunity_id: opportunity?.id || null,
      activity_type: 'lead_converted',
      title: `Converted from lead: ${lead.company_name}`,
      description: [
        contact ? `Primary contact: ${firstName} ${lastName}` : null,
        opportunity ? `Initial opportunity: ${opportunity_name}` : null,
      ].filter(Boolean).join('. '),
      created_by: authData.user.id,
    });

    return NextResponse.json({
      lead: { ...lead, status: 'converted', converted_to_account_id: account.id },
      account,
      contact,
      opportunity,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
