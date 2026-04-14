import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const client = await supabaseServer();
    const { data: authData, error: authErr } = await client.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountOwnerId = searchParams.get('account_owner_id');
    const minDate = searchParams.get('min_date');
    const maxDate = searchParams.get('max_date');

    let query = client
      .from('opportunities')
      .select(
        'id, name, status, estimated_value, probability_percent, expected_close_date, accounts(id, name, account_owner_id)',
        { count: 'exact' }
      )
      .not('status', 'is', null);

    // Filter by date range if provided
    if (minDate) {
      query = query.gte('expected_close_date', minDate);
    }
    if (maxDate) {
      query = query.lte('expected_close_date', maxDate);
    }

    // Filter by account owner if provided
    if (accountOwnerId) {
      query = query.eq('accounts.account_owner_id', accountOwnerId);
    } else {
      // Default: show all opportunities for accounts owned by current user
      query = query.eq('accounts.created_by', authData.user.id);
    }

    const { data: opportunities, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Group opportunities by status and calculate pipeline metrics
    const pipeline: Record<
      string,
      {
        status: string;
        count: number;
        totalValue: number;
        expectedValue: number;
        opportunities: any[];
      }
    > = {};

    const statuses = [
      'prospecting',
      'discovery',
      'proposal',
      'negotiation',
      'won',
      'lost',
    ];

    // Initialize all statuses
    statuses.forEach((status) => {
      pipeline[status] = {
        status,
        count: 0,
        totalValue: 0,
        expectedValue: 0,
        opportunities: [],
      };
    });

    // Populate pipeline data
    opportunities?.forEach((opp: any) => {
      const stage = pipeline[opp.status];
      if (stage) {
        stage.count += 1;
        stage.opportunities.push(opp);

        const value = opp.estimated_value || 0;
        stage.totalValue += value;

        // Expected value = value × probability
        const expectedVal =
          value * ((opp.probability_percent || 0) / 100);
        stage.expectedValue += expectedVal;
      }
    });

    // Calculate total pipeline metrics
    const totalPipeline = Object.values(pipeline).reduce(
      (acc: any, stage: any) => ({
        totalOpportunities: acc.totalOpportunities + stage.count,
        totalValue: acc.totalValue + stage.totalValue,
        totalExpectedValue:
          acc.totalExpectedValue + stage.expectedValue,
      }),
      { totalOpportunities: 0, totalValue: 0, totalExpectedValue: 0 }
    );

    // Convert to array and sort by pipeline order
    const pipelineArray = statuses
      .map((status) => pipeline[status])
      .filter((stage) => stage.count > 0 || stage.totalValue > 0);

    return NextResponse.json({
      pipeline: pipelineArray,
      summary: {
        ...totalPipeline,
        averageDealSize:
          totalPipeline.totalOpportunities > 0
            ? totalPipeline.totalValue / totalPipeline.totalOpportunities
            : 0,
        winRate:
          (pipeline.won?.count || 0) /
          ((pipeline.won?.count || 0) + (pipeline.lost?.count || 0) || 1),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
