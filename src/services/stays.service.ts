import { supabase } from "@/integrations/supabase/client";
import type { Vehicle } from "@/types/valet";
import { ensureSupabaseConfigured, isSupabaseConfigured, parseDate, toVehicle } from "@/services/service-utils";
import type { CreateVehicleInput, RegisterExitInput, UpdateVehicleSpotInput } from "@/services/valet.types";

export async function listVehicleStays(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase.from("vehicle_stays").select("*").order("entry_time", { ascending: false });
    if (error) {
      return [];
    }

    return (data ?? []).map(toVehicle);
  } catch {
    return [];
  }
}

export async function createVehicleStay(input: CreateVehicleInput): Promise<Vehicle> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("vehicle_stays")
    .insert({
      plate: input.plate.trim().toUpperCase(),
      parking_spot_id: input.spotId,
      model: input.model.trim(),
      brand: "",
      color: "",
      year: new Date().getFullYear(),
      status: "parked",
      entry_time: new Date().toISOString(),
      client_name: input.clientName.trim(),
      driver_name: input.driverName?.trim() || null,
      client_phone: input.clientPhone?.trim() || null,
      observations: input.observations?.trim() || null,
      contract_type: input.contractType ?? "hourly",
      unit_name: input.unitName ?? null,
      inspection: input.createInspection
        ? {
            ...input.inspection,
            completedAt: parseDate(input.inspection?.completedAt).toISOString(),
          }
        : null,
      prepaid_paid: Boolean(input.prepaidAmount),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toVehicle(data);
}

export async function requestVehiclePickup(vehicleId: string): Promise<Vehicle> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("request_vehicle_pickup", { p_stay_id: vehicleId });
  if (error) {
    throw new Error(error.message);
  }

  return toVehicle(data);
}

export async function registerVehicleExit(input: RegisterExitInput): Promise<Vehicle> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("register_vehicle_exit", {
    p_stay_id: input.vehicleId,
    p_payment_method: input.paymentMethod,
    p_amount: input.amount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toVehicle(data);
}

export async function moveVehicleToSpot(input: UpdateVehicleSpotInput): Promise<Vehicle> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("move_vehicle_spot", {
    p_stay_id: input.vehicleId,
    p_parking_spot_id: input.spotId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return toVehicle(data);
}
