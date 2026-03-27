import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import SignaturePad from '@/components/SignaturePad';
import { generateAgreementPdf } from '@/lib/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileText, User, DollarSign, PenLine } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Agreement = Tables<'agreements'>;
type Debtor = Tables<'debtors'>;
type Signature = Tables<'signatures'>;

export default function AgreementDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignPad, setShowSignPad] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: agr } = await supabase.from('agreements').select('*').eq('id', id!).single();
    if (agr) {
      setAgreement(agr);
      const { data: deb } = await supabase.from('debtors').select('*').eq('id', agr.debtor_id).single();
      setDebtor(deb);
      const { data: sigs } = await supabase.from('signatures').select('*').eq('agreement_id', agr.id);
      setSignatures(sigs || []);
    }
    setLoading(false);
  };

  const updateStatus = async (status: string) => {
    if (!agreement) return;
    const { error } = await supabase
      .from('agreements')
      .update({ status: status as Agreement['status'] })
      .eq('id', agreement.id);
    if (error) { toast.error(error.message); return; }
    setAgreement({ ...agreement, status: status as Agreement['status'] });
    toast.success('Status updated');
  };

  const handleSignature = async (dataUrl: string) => {
    if (!agreement) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const sigPath = `${agreement.id}/signature-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from('signatures').upload(sigPath, blob, { contentType: 'image/png' });
      if (upErr) throw upErr;

      const { data: pubUrl } = supabase.storage.from('signatures').getPublicUrl(sigPath);
      await supabase.from('signatures').insert({ agreement_id: agreement.id, file_url: pubUrl.publicUrl, signer_type: 'debtor' });
      await supabase.from('agreements').update({ status: 'signed' }).eq('id', agreement.id);

      // Regenerate PDF with signature
      if (debtor) {
        const pdf = generateAgreementPdf({
          debtorName: debtor.name,
          debtorEmail: debtor.email || undefined,
          debtorPhone: debtor.phone || undefined,
          debtorAddress: debtor.address || undefined,
          debtAmount: Number(agreement.debt_amount),
          totalWithInterest: Number(agreement.total_with_interest),
          interestRate: Number(agreement.interest_rate),
          numInstallments: agreement.num_installments,
          installmentAmount: Number(agreement.installment_amount),
          paymentFrequency: agreement.payment_frequency,
          startDate: agreement.start_date,
          terms: agreement.terms || undefined,
          signatureDataUrl: dataUrl,
          agreementId: agreement.id,
          createdAt: agreement.created_at,
        });
        const pdfBlob = pdf.output('blob');
        const pdfPath = `${agreement.id}/agreement.pdf`;
        await supabase.storage.from('agreements').upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        const { data: pdfPub } = supabase.storage.from('agreements').getPublicUrl(pdfPath);
        await supabase.from('agreements').update({ pdf_url: pdfPub.publicUrl }).eq('id', agreement.id);
      }

      toast.success('Signature captured and agreement signed!');
      setShowSignPad(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!agreement || !debtor) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Agreement not found</p>
          <Link to="/" className="mt-4 inline-block"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary', pending: 'outline', signed: 'default', completed: 'default', cancelled: 'destructive',
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Agreement Details</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{agreement.id}</p>
          </div>
          <Badge variant={statusVariant[agreement.status] ?? 'secondary'} className="text-sm">
            {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-accent" />
                Debtor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{debtor.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{debtor.email || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{debtor.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{debtor.address || '—'}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-accent" />
                Financial Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Debt Amount</span><span className="font-medium">${Number(agreement.debt_amount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span>{Number(agreement.interest_rate)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Due</span><span className="font-medium">${Number(agreement.total_with_interest).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Installments</span><span>{agreement.num_installments}× {agreement.payment_frequency}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Per Installment</span><span>${Number(agreement.installment_amount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span>{new Date(agreement.start_date).toLocaleDateString()}</span></div>
            </CardContent>
          </Card>
        </div>

        {agreement.terms && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agreement.terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Signatures */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4 text-accent" />
              Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signatures.length > 0 ? (
              <div className="space-y-3">
                {signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <img src={sig.file_url} alt="Signature" className="h-12 max-w-[200px] object-contain" />
                    <div className="text-xs text-muted-foreground">
                      <p className="capitalize">{sig.signer_type}</p>
                      <p>{new Date(sig.signed_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No signatures yet</p>
            )}
            {agreement.status !== 'signed' && agreement.status !== 'completed' && (
              <div className="mt-4">
                {showSignPad ? (
                  <SignaturePad onSave={handleSignature} />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowSignPad(true)}>
                    <PenLine className="mr-1.5 h-3.5 w-3.5" />
                    Capture Signature
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Select value={agreement.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {agreement.pdf_url && (
            <a href={agreement.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </a>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
