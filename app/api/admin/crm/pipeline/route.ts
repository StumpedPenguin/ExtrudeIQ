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
    const accountOwnerIds = searchParams.get('account_owner_ids');
    const minDate = searchParams.get('min_date');
    const maxDate = searchParams.get('max_date');
    const stage = searchParams.get('stage');

    let query = client
      .from('opportunities')
      .select(
        'id, name, status, estimated_value, probability_percent, expected_close_date, accounts(id, name, account_owner_id)',
        { count: 'exact' }
      )
      .not('status', 'is', null);

    // Filter by stage if provided
    if (stage) {
      query = query.eq('status', stage);
    }

    // Filter by date range if provided
    if (minDate) {
      query = query.gte('expected_close_date', minDate);
    }
    if (maxDate) {
      query = query.lte('expected_close_date', maxDate);
    }

    // Filter by account owner(s) if provided
    if (accountOwnerIds) {
      const ownerIdList = accountOwnerIds.split(',').filter(Boolean);
      if (ownerIdList.length === 1) {
        query = query.eq('accounts.account_owner_id', ownerIdList[0]);
      } else if (ownerIdList.length > 1) {
        query = query.in('accounts.account_owner_id', ownerIdList);
      }
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

    // --- Monthly Forecast (by expected_close_date) ---
    const monthlyMap: Record<string, { month: string; estimated: number; weighted: number; count: number }> = {};
    opportunities?.forEach((opp: any) => {
      if (!opp.expected_close_date) return;
      const d = new Date(opp.expected_close_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, estimated: 0, weighted: 0, count: 0 };
      const val = opp.estimated_value || 0;
      monthlyMap[key].estimated += val;
      monthlyMap[key].weighted += val * ((opp.probability_percent || 0) / 100);
      monthlyMap[key].count += 1;
    });
    const monthlyForecast = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    // --- Top Deals ---
    const topDeals = [...(opportunities || [])]
      .sort((a: any, b: any) => (b.estimated_value || 0) - (a.estimated_value || 0))
      .slice(0, 10)
      .map((opp: any) => ({
        id: opp.id,
        name: opp.name,
        status: opp.status,
        estimated_value: opp.estimated_value || 0,
        probability_percent: opp.probability_percent || 0,
        weighted_value: (opp.estimated_value || 0) * ((opp.probability_percent || 0) / 100),
        expected_close_date: opp.expected_close_date,
        account_name: opp.accounts?.name || null,
        account_id: opp.accounts?.id || null,
      }));

    // --- Stage Velocity (avg days in pipeline by stage) ---
    const now = new Date();
    const stageAging: Record<string, { totalDays: number; count: number }> = {};
    opportunities?.forEach((opp: any) => {
      if (!opp.status) return;
      if (!stageAging[opp.status]) stageAging[opp.status] = { totalDays: 0, count: 0 };
      // approximate age from expected_close_date minus today, or created_at
      const closeDate = opp.expected_close_date ? new Date(opp.expected_close_date) : null;
      if (closeDate) {
        const diffDays = Math.round((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        stageAging[opp.status].totalDays += diffDays;
        stageAging[opp.status].count += 1;
      }
    });
    const agingByStage = statuses
      .filter((s) => stageAging[s] && stageAging[s].count > 0)
      .map((s) => ({
        status: s,
        avgDaysToClose: Math.round(stageAging[s].totalDays / stageAging[s].count),
        count: stageAging[s].count,
      }));

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
      monthlyForecast,
      topDeals,
      agingByStage,
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
