"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { fetchJson } from "@/lib/fetchJson";

// Simple chart components using CSS
const ProgressBar = ({ value, max, color = "bg-brand-500" }: { value: number; max: number; color?: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const StatCard = ({ title, value, subtitle, trend, trendUp }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
}) => (
  <Card className="h-full">
    <div className="flex flex-col h-full">
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  </Card>
);

type AnalyticsData = {
  totalMembers: number;
  totalAttendanceThisMonth: number;
  averageAttendanceRate: number;
  pendingApprovals: number;
  presentToday: number;
  absentToday: number;
  memberGrowth: Array<{ month: string; count: number }>;
  attendanceTrend: Array<{ month: string; present: number; absent: number }>;
  groupWiseStats: Array<{ group: number; present: number; total: number }>;
  topAttendees: Array<{ name: string; attendance: number; groups: number[] }>;
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchJson<AnalyticsData>("/api/stats/analytics");
      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError("Failed to load analytics");
      }
    } catch (err) {
      setError("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner label="Loading analytics..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-500">{error || "No data available"}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 text-brand-600 hover:underline"
        >
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Total Members"
          value={data.totalMembers}
          subtitle="Active members"
        />
        <StatCard
          title="Monthly Attendance"
          value={data.totalAttendanceThisMonth}
          subtitle={`${Math.round(data.averageAttendanceRate)}% avg rate`}
          trend={`${data.averageAttendanceRate >= 75 ? '+5%' : '-3%'}`}
          trendUp={data.averageAttendanceRate >= 75}
        />
        <StatCard
          title="Pending Approvals"
          value={data.pendingApprovals}
          subtitle="Awaiting admin approval"
        />
        <StatCard
          title="Today's Status"
          value={`${data.presentToday}/${data.presentToday + data.absentToday}`}
          subtitle={`${data.presentToday} present, ${data.absentToday} absent`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Attendance Trend (Last 6 Months)
          </h3>
          <div className="space-y-4">
            {data.attendanceTrend.slice(-6).map((month) => (
              <div key={month.month}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{month.month}</span>
                  <span className="text-slate-900 font-medium">
                    {month.present} / {month.present + month.absent}
                  </span>
                </div>
                <ProgressBar
                  value={month.present}
                  max={month.present + month.absent}
                  color="bg-green-500"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Group-wise Statistics */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Group-wise Attendance
          </h3>
          <div className="space-y-4">
            {data.groupWiseStats.map((group) => (
              <div key={group.group}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Group {group.group}</span>
                  <span className="text-slate-900 font-medium">
                    {Math.round((group.present / group.total) * 100)}% ({group.present}/{group.total})
                  </span>
                </div>
                <ProgressBar
                  value={group.present}
                  max={group.total}
                  color={group.present / group.total >= 0.75 ? "bg-green-500" : group.present / group.total >= 0.5 ? "bg-yellow-500" : "bg-red-500"}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Attendees */}
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Top Performers (This Month)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Group</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Attendance</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.topAttendees.map((attendee, index) => (
                <tr key={attendee.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    {index < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">{index + 1}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{attendee.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {attendee.groups.length > 0 
                      ? attendee.groups.map(g => `Group ${g}`).join(", ") 
                      : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {attendee.attendance} days
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((attendee.attendance / 25) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{Math.round((attendee.attendance / 25) * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
