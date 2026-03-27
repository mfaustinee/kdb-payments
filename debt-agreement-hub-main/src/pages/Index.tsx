import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FilePlus, Search, Download, Eye, DollarSign, FileText, Clock, CheckCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Agreement = Tables<'agreements'> & { debtors: Tables<'debtors'> | null };

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'outline' },
  signed: { label: 'Signed', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchAgreements();
  }, [user]);

  const fetchAgreements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agreements')
      .select('*, debtors(*)')
      .order('created_at', { ascending: false });
    if (!error && data) setAgreements(data as Agreement[]);
    setLoading(false);
  };

  const filtered = agreements.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search && !a.debtors?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: agreements.length,
    totalValue: agreements.reduce((s, a) => s + Number(a.total_with_interest), 0),
    signed: agreements.filter((a) => a.status === 'signed').length,
    pending: agreements.filter((a) => a.status === 'draft' || a.status === 'pending').length,
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage debt repayment agreements</p>
          </div>
          <Link to="/agreements/new">
            <Button>
              <FilePlus className="mr-2 h-4 w-4" />
              New Agreement
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Agreements', value: stats.total, icon: FileText, color: 'text-primary' },
            { label: 'Total Value', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-accent' },
            { label: 'Signed', value: stats.signed, icon: CheckCircle, color: 'text-success' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by debtor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading agreements...</div>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">No agreements found</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first agreement to get started</p>
              <Link to="/agreements/new" className="mt-4">
                <Button size="sm">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Create Agreement
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Debtor</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Installments</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Created</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-sm text-foreground">{a.debtors?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{a.debtors?.email}</p>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <p className="text-sm font-medium text-foreground">${Number(a.total_with_interest).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">${Number(a.installment_amount).toLocaleString()}/ea</p>
                      </td>
                      <td className="p-3 hidden md:table-cell text-sm text-foreground">
                        {a.num_installments}× {a.payment_frequency}
                      </td>
                      <td className="p-3">
                        <Badge variant={statusConfig[a.status]?.variant ?? 'secondary'}>
                          {statusConfig[a.status]?.label ?? a.status}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/agreements/${a.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {a.pdf_url && (
                            <a href={a.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
