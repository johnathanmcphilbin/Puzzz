import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, GamepadIcon, Activity, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalVisitors: number;
  activeUsers: number;
  totalGames: number;
  popularGames: Array<{ game_type: string; count: number }>;
  recentEvents: Array<{ event_type: string; created_at: string; game_type?: string; room_code?: string }>;
}

export const AnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData>({
    totalVisitors: 0,
    activeUsers: 0,
    totalGames: 0,
    popularGames: [],
    recentEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get total unique visitors (sessions)
        const { count: totalVisitors } = await supabase
          .from('analytics_sessions')
          .select('*', { count: 'exact', head: true });

        // Get active users (last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { count: activeUsers } = await supabase
          .from('analytics_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_activity', thirtyMinutesAgo);

        // Get total games started
        const { count: totalGames } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'game_start');

        // Get popular games
        const { data: gameEvents } = await supabase
          .from('analytics_events')
          .select('game_type')
          .eq('event_type', 'game_start')
          .not('game_type', 'is', null);

        const gameCount = gameEvents?.reduce((acc: Record<string, number>, event) => {
          if (event.game_type) {
            acc[event.game_type] = (acc[event.game_type] || 0) + 1;
          }
          return acc;
        }, {}) || {};

        const popularGames = Object.entries(gameCount)
          .map(([game_type, count]) => ({ game_type, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Get recent events
        const { data: recentEvents } = await supabase
          .from('analytics_events')
          .select('event_type, created_at, game_type, room_code')
          .order('created_at', { ascending: false })
          .limit(10);

        setData({
          totalVisitors: totalVisitors || 0,
          activeUsers: activeUsers || 0,
          totalGames: totalGames || 0,
          popularGames,
          recentEvents: recentEvents || []
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel('analytics-dashboard')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'analytics_events' 
      }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">All time sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Last 30 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Started</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalGames}</div>
            <p className="text-xs text-muted-foreground">Total game sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalVisitors > 0 ? Math.round((data.totalGames / data.totalVisitors) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Visitors to games</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Games */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Games</CardTitle>
            <CardDescription>Most played game types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.popularGames.length > 0 ? (
              data.popularGames.map((game, index) => (
                <div key={game.game_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium capitalize">
                      {game.game_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {game.count} games
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No games played yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentEvents.length > 0 ? (
              data.recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                    {event.game_type && (
                      <span className="text-muted-foreground capitalize">
                        {event.game_type.replace('_', ' ')}
                      </span>
                    )}
                    {event.room_code && (
                      <code className="text-xs bg-muted px-1 rounded">
                        {event.room_code}
                      </code>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};