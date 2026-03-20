import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/types/valet";
import { ensureSupabaseConfigured, isSupabaseConfigured, normalizePlate, toClient } from "@/services/service-utils";
import type { AddClientVehicleInput, ChargeClientInput, CreateClientInput, UpdateClientInput } from "@/services/valet.types";

async function getCurrentUnitId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_user_primary_unit_id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nenhuma unidade encontrada para o usuario autenticado.");
  }

  return String(data);
}

async function syncClientVehicles(
  clientId: string,
  vehicleDrivers?: Record<string, string>,
  vehicleModels?: Record<string, string>,
) {
  if (!vehicleDrivers && !vehicleModels) {
    return;
  }

  const { data: vehicleRows, error: vehiclesError } = await supabase
    .from("client_vehicles")
    .select("id, plate")
    .eq("client_id", clientId);

  if (vehiclesError) {
    throw new Error(vehiclesError.message);
  }

  for (const vehicleRow of vehicleRows ?? []) {
    const normalizedPlate = normalizePlate(String(vehicleRow.plate ?? ""));
    const nextDriverName = vehicleDrivers?.[normalizedPlate];
    const nextModel = vehicleModels?.[normalizedPlate];

    if (nextDriverName === undefined && nextModel === undefined) {
      continue;
    }

    const { error: updateVehicleError } = await supabase
      .from("client_vehicles")
      .update({
        driver_name: nextDriverName?.trim() || null,
        model: nextModel?.trim() || null,
      })
      .eq("id", String(vehicleRow.id));

    if (updateVehicleError) {
      throw new Error(updateVehicleError.message);
    }
  }
}

export async function listClients(): Promise<Client[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const [clientsResult, vehiclesResult] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("client_vehicles").select("*").order("created_at", { ascending: false }),
    ]);

    if (clientsResult.error || vehiclesResult.error) {
      return [];
    }

    return (clientsResult.data ?? []).map((row) => toClient(row, vehiclesResult.data ?? []));
  } catch {
    return [];
  }
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  ensureSupabaseConfigured();
  const unitId = await getCurrentUnitId();
  const { data: clientRow, error } = await supabase
    .from("clients")
    .insert({
      unit_id: unitId,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      cpf: input.cpf?.trim() || null,
      cnpj: input.cnpj?.trim() || null,
      category: input.category,
      is_vip: Boolean(input.isVip),
      included_spots: input.includedSpots ?? 1,
      vip_spots: input.vipSpots ?? 0,
      monthly_fee: input.monthlyFee,
      billing_due_day: input.billingDueDay,
      billing_due_date: input.billingDueDate,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const vehiclesPayload = input.vehicles
    .map((plate) => normalizePlate(plate))
    .filter(Boolean)
    .map((plate) => ({
      unit_id: unitId,
      client_id: clientRow.id,
      plate,
      driver_name: input.vehicleDrivers?.[plate] ?? null,
      model: input.vehicleModels?.[plate] ?? null,
    }));

  if (vehiclesPayload.length > 0) {
    const { error: vehiclesError } = await supabase.from("client_vehicles").insert(vehiclesPayload);
    if (vehiclesError) {
      throw new Error(vehiclesError.message);
    }
  }

  const clients = await listClients();
  const client = clients.find((item) => item.id === clientRow.id);
  if (!client) {
    throw new Error("Cliente criado, mas nao foi possivel recarregar o cadastro.");
  }

  return client;
}

export async function updateClient(input: UpdateClientInput): Promise<Client> {
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("clients")
    .update({
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      cpf: input.cpf?.trim() || null,
      cnpj: input.cnpj?.trim() || null,
      billing_due_day: input.dueDay,
      is_vip: Boolean(input.isVip),
      included_spots: input.includedSpots ?? null,
      vip_spots: input.vipSpots ?? null,
      monthly_fee: input.monthlyFee,
    })
    .eq("id", input.clientId);

  if (error) {
    throw new Error(error.message);
  }

  await syncClientVehicles(input.clientId, input.vehicleDrivers, input.vehicleModels);

  const clients = await listClients();
  const client = clients.find((item) => item.id === input.clientId);
  if (!client) {
    throw new Error("Cliente atualizado, mas nao foi possivel recarregar o cadastro.");
  }

  return client;
}

export async function addClientVehicle(input: AddClientVehicleInput): Promise<Client> {
  ensureSupabaseConfigured();
  const clients = await listClients();
  const client = clients.find((item) => item.id === input.clientId);

  if (!client) {
    throw new Error("Cliente nao encontrado para vincular a placa.");
  }

  const normalizedPlate = normalizePlate(input.plate);

  if (client.vehicles.some((plate) => normalizePlate(plate) === normalizedPlate)) {
    throw new Error("Esta placa ja esta vinculada a este cliente.");
  }

  if (client.category === "monthly" && client.vehicles.length >= 3) {
    throw new Error("Mensalista pode ter no maximo 3 placas vinculadas.");
  }

  const unitId = await getCurrentUnitId();
  const { error } = await supabase.from("client_vehicles").insert({
    unit_id: unitId,
    client_id: input.clientId,
    plate: normalizedPlate,
    driver_name: input.driverName?.trim() || null,
    model: input.model?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const refreshedClients = await listClients();
  const refreshedClient = refreshedClients.find((item) => item.id === input.clientId);
  if (!refreshedClient) {
    throw new Error("Veiculo vinculado, mas nao foi possivel recarregar o cliente.");
  }

  return refreshedClient;
}

export async function chargeClient(input: ChargeClientInput): Promise<Client> {
  ensureSupabaseConfigured();
  if (typeof input.amount !== "number" || input.amount <= 0) {
    throw new Error("O valor da cobranca precisa ser maior que zero.");
  }

  if (typeof input.amount === "number" && input.amount > 0) {
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        monthly_fee: input.amount,
      })
      .eq("id", input.clientId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  const { error } = await supabase.rpc("charge_client_subscription", {
    p_client_id: input.clientId,
    p_payment_method: input.paymentMethod,
  });

  if (error) {
    throw new Error(error.message);
  }

  const clients = await listClients();
  const client = clients.find((item) => item.id === input.clientId);
  if (!client) {
    throw new Error("Cobranca executada, mas nao foi possivel recarregar o cliente.");
  }

  return client;
}
