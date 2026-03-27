import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import SignaturePad from '@/components/SignaturePad';
import { generateAgreementPdf } from '@/lib/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, User, DollarSign, FileDown } from 'lucide-react';

export default function NewAgreement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    debtorName: '',
    debtorEmail: '',
    debtorPhone: '',
    debtorAddress: '',
    debtAmount: '',
    interestRate: '0',
    numInstallments: '12',
    paymentFrequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    terms: '',
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const calc = useMemo(() => {
    const amount = parseFloat(form.debtAmount) || 0;
    const rate = parseFloat(form.interestRate) || 0;
    const n = parseInt(form.numInstallments) || 1;
    const total = amount * (1 + rate / 100);
    const installment = total / n;
    return { total: Math.round(total * 100) / 100, installment: Math.round(installment * 100) / 100 };
  }, [form.debtAmount, form.interestRate, form.numInstallments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.debtorName.trim()) { toast.error('Debtor name is required'); return; }
    if (!form.debtAmount || parseFloat(form.debtAmount) <= 0) { toast.error('Valid debt amount required'); return; }

    setSaving(true);
    try {
      // 1. Create debtor
      const { data: debtor, error: debtorErr } = await supabase
        .from('debtors')
        .insert({
          name: form.debtorName.trim(),
          email: form.debtorEmail.trim() || null,
          phone: form.debtorPhone.trim() || null,
          address: form.debtorAddress.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (debtorErr) throw debtorErr;

      // 2. Create agreement
      const { data: agreement, error: agreeErr } = await supabase
        .from('agreements')
        .insert({
          debtor_id: debtor.id,
          created_by: user.id,
          debt_amount: parseFloat(form.debtAmount),
          total_with_interest: calc.total,
          interest_rate: parseFloat(form.interestRate),
          num_installments: parseInt(form.numInstallments),
          installment_amount: calc.installment,
          payment_frequency: form.paymentFrequency,
          start_date: form.startDate,
          terms: form.terms.trim() || null,
          status: signatureDataUrl ? 'signed' : 'draft',
        })
        .select()
        .single();
      if (agreeErr) throw agreeErr;

      // 3. Upload signature if provided
      let sigUrl: string | undefined;
      if (signatureDataUrl) {
        const blob = await (await fetch(signatureDataUrl)).blob();
        const sigPath = `${agreement.id}/signature.png`;
        const { error: sigUpErr } = await supabase.storage
          .from('signatures')
          .upload(sigPath, blob, { contentType: 'image/png' });
        if (sigUpErr) throw sigUpErr;

        const { data: sigPublic } = supabase.storage.from('signatures').getPublicUrl(sigPath);
        sigUrl = sigPublic.publicUrl;

        await supabase.from('signatures').insert({
          agreement_id: agreement.id,
          file_url: sigUrl,
          signer_type: 'debtor',
        });
      }

      // 4. Generate PDF
      const pdf = generateAgreementPdf({
        debtorName: form.debtorName,
        debtorEmail: form.debtorEmail,
        debtorPhone: form.debtorPhone,
        debtorAddress: form.debtorAddress,
        debtAmount: parseFloat(form.debtAmount),
        totalWithInterest: calc.total,
        interestRate: parseFloat(form.interestRate),
        numInstallments: parseInt(form.numInstallments),
        installmentAmount: calc.installment,
        paymentFrequency: form.paymentFrequency,
        startDate: form.startDate,
        terms: form.terms,
        signatureDataUrl: signatureDataUrl || undefined,
        agreementId: agreement.id,
        createdAt: agreement.created_at,
      });

      const pdfBlob = pdf.output('blob');
      const pdfPath = `${agreement.id}/agreement.pdf`;
      const { error: pdfUpErr } = await supabase.storage
        .from('agreements')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' });
      if (pdfUpErr) throw pdfUpErr;

      const { data: pdfPublic } = supabase.storage.from('agreements').getPublicUrl(pdfPath);

      await supabase
        .from('agreements')
        .update({ pdf_url: pdfPublic.publicUrl })
        .eq('id', agreement.id);

      toast.success('Agreement created successfully!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create agreement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">New Agreement</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a debt repayment agreement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Debtor Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-accent" />
                Debtor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={form.debtorName} onChange={(e) => update('debtorName', e.target.value)} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.debtorEmail} onChange={(e) => update('debtorEmail', e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.debtorPhone} onChange={(e) => update('debtorPhone', e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.debtorAddress} onChange={(e) => update('debtorAddress', e.target.value)} placeholder="123 Main St, City, State" />
              </div>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-accent" />
                Financial Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Debt Amount ($) *</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" value={form.debtAmount} onChange={(e) => update('debtAmount', e.target.value)} placeholder="10000.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Interest Rate (%)</Label>
                <Input id="rate" type="number" step="0.01" min="0" max="100" value={form.interestRate} onChange={(e) => update('interestRate', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installments">Number of Installments</Label>
                <Input id="installments" type="number" min="1" max="360" value={form.numInstallments} onChange={(e) => update('numInstallments', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Payment Frequency</Label>
                <Select value={form.paymentFrequency} onValueChange={(v) => update('paymentFrequency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Calculated</Label>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="font-medium">${calc.total.toLocaleString()}</span>
                    <span className="text-muted-foreground"> total · </span>
                    <span className="font-medium">${calc.installment.toLocaleString()}</span>
                    <span className="text-muted-foreground">/ea</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="terms">Additional Terms</Label>
                <Textarea id="terms" value={form.terms} onChange={(e) => update('terms', e.target.value)} placeholder="Any additional terms or conditions..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileDown className="h-4 w-4 text-accent" />
                Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signatureDataUrl ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <img src={signatureDataUrl} alt="Captured signature" className="max-h-24" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSignatureDataUrl(null)}>
                    Re-sign
                  </Button>
                </div>
              ) : (
                <SignaturePad onSave={setSignatureDataUrl} />
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Agreement'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
