import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClientMutation } from "@/hooks/useValetData";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone obrigatório"),
  cpf: z.string().optional(),
  tier: z.enum(["bronze", "silver", "gold", "diamond"]),
});

type FormValues = z.infer<typeof schema>;

interface ClientCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientCreateDialog({ open, onOpenChange }: ClientCreateDialogProps) {
  const createClient = useCreateClientMutation();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      tier: "silver",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createClient.mutateAsync(values);
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um cliente no programa de fidelidade.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input placeholder="Nome" {...form.register("name")} />
          <Input placeholder="E-mail" type="email" {...form.register("email")} />
          <Input placeholder="Telefone" {...form.register("phone")} />
          <Input placeholder="CPF (opcional)" {...form.register("cpf")} />

          <Select value={form.watch("tier")} onValueChange={(value) => form.setValue("tier", value as FormValues["tier"])}>
            <SelectTrigger>
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Prata</SelectItem>
              <SelectItem value="gold">Ouro</SelectItem>
              <SelectItem value="diamond">Diamante</SelectItem>
            </SelectContent>
          </Select>

          {Object.values(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">Preencha os dados corretamente.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
