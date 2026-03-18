import { useMemo, useState } from "react";
import { getAgreementById } from "@/config/pricing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSettings } from "@/lib/app-settings";
import { formatCurrencyBRL } from "@/lib/format";
import type { PaymentMethod } from "@/types/valet";

export interface PrepaidChargeSelection {
  amount: number;
  agreementId: string;
  paymentMethod: PaymentMethod;
}

interface PrepaidChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plate: string;
  model: string;
  clientName: string;
  initial?: PrepaidChargeSelection;
  onConfirm: (selection: PrepaidChargeSelection) => void;
}

export function PrepaidChargeDialog({
  open,
  onOpenChange,
  plate,
  model,
  clientName,
  initial,
  onConfirm,
}: PrepaidChargeDialogProps) {
  const settings = useAppSettings();
  const [agreementId, setAgreementId] = useState(initial?.agreementId ?? "none");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "pix");

  const amount = useMemo(() => {
    const agreement = getAgreementById(agreementId);
    const discount = (settings.parkingDailyRate * agreement.discountPercent) / 100;
    return Number((settings.parkingDailyRate - discount).toFixed(2));
  }, [agreementId, settings.parkingDailyRate]);

  const handleConfirm = () => {
    onConfirm({ amount, agreementId, paymentMethod });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobranca antecipada</DialogTitle>
          <DialogDescription>Diaria maxima do patio com opcao de convenio.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-sm">
          <p><strong>Veiculo:</strong> {plate || "-"}</p>
          <p><strong>Cliente:</strong> {clientName || "-"}</p>
          <p><strong>Modelo:</strong> {model || "-"}</p>
          <p><strong>Tempo registrado:</strong> 0h 0min (entrada atual)</p>
        </div>

        <div className="space-y-2">
          <Label>Opcao de diaria</Label>
          <div className="rounded-md border p-3 text-sm">
            Diaria do patio: <strong>{formatCurrencyBRL(settings.parkingDailyRate)}</strong>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Convenio</Label>
          <Select value={agreementId} onValueChange={setAgreementId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um convenio" />
            </SelectTrigger>
            <SelectContent>
              {settings.agreementOptions.map((agreement) => (
                <SelectItem key={agreement.id} value={agreement.id}>
                  {agreement.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Valor final da cobranca: {formatCurrencyBRL(amount)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Forma de pagamento</Label>
          <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue placeholder="Forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="credit">Credito</SelectItem>
              <SelectItem value="debit">Debito</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="monthly" disabled className="line-through">Mensalista (em breve)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>Aplicar cobranca</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
