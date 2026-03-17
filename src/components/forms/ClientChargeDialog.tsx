import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChargeClientMutation } from "@/hooks/useValetData";
import { formatCurrencyBRL } from "@/lib/format";
import type { Client, PaymentMethod } from "@/types/valet";

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function buildNextDueDate(client: Client) {
  const nextMonth = new Date(client.billingDueDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    clampDayToMonth(nextMonth.getFullYear(), nextMonth.getMonth(), client.billingDueDay),
  );
}

interface ClientChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientChargeDialog({ open, onOpenChange, client }: ClientChargeDialogProps) {
  const chargeClient = useChargeClientMutation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nextDueDate = useMemo(() => (client ? buildNextDueDate(client) : null), [client]);

  const handleConfirm = async () => {
    if (!client) return;
    setSubmitError(null);
    try {
      await chargeClient.mutateAsync({ clientId: client.id, paymentMethod });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Nao foi possivel registrar a cobranca.");
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Realizar cobranca</DialogTitle>
          <DialogDescription>
            Registre o pagamento da mensalidade e avance o vencimento para o proximo ciclo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p><strong>Cliente:</strong> {client.name}</p>
            <p><strong>Valor:</strong> {formatCurrencyBRL(client.monthlyFee)}</p>
            <p><strong>Vencimento atual:</strong> {client.billingDueDate.toLocaleDateString("pt-BR")}</p>
            <p><strong>Proximo vencimento:</strong> {nextDueDate?.toLocaleDateString("pt-BR")}</p>
          </div>

          <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue placeholder="Forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="credit">Credito</SelectItem>
              <SelectItem value="debit">Debito</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
            </SelectContent>
          </Select>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={chargeClient.isPending}>
            {chargeClient.isPending ? "Salvando..." : "Confirmar cobranca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
