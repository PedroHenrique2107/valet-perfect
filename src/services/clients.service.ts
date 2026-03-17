import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/types/valet";
import { ensureSupabaseConfigured, isSupabaseConfigured, normalizePlate, toClient } from "@/services/service-utils";
import type { AddClientVehicleInput, ChargeClientInput, CreateClientInput, UpdateClientInput } from "@/services/valet.types";

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
  const { data: clientRow, error } = await supabase
    .from("clients")
    .insert({
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      cpf: input.cpf?.trim() || null,
      cnpj: input.cnpj?.trim() || null,
      category: input.category,
      is_vip: Boolean(input.isVip),
      included_spots: input.includedSpots ?? 1,
      vip_spots: input.vipSpots ?? 0,
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
    })
    .eq("id", input.clientId);

  if (error) {
    throw new Error(error.message);
  }

  const clients = await listClients();
  const client = clients.find((item) => item.id === input.clientId);
  if (!client) {
    throw new Error("Cliente atualizado, mas nao foi possivel recarregar o cadastro.");
  }

  return client;
}

export async function addClientVehicle(input: AddClientVehicleInput): Promise<Client> {
  ensureSupabaseConfigured();
  const { error } = await supabase.from("client_vehicles").insert({
    client_id: input.clientId,
    plate: normalizePlate(input.plate),
    driver_name: input.driverName?.trim() || null,
    model: input.model?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const clients = await listClients();
  const client = clients.find((item) => item.id === input.clientId);
  if (!client) {
    throw new Error("Veiculo vinculado, mas nao foi possivel recarregar o cliente.");
  }

  return client;
}

export async function chargeClient(input: ChargeClientInput): Promise<Client> {
  ensureSupabaseConfigured();
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
