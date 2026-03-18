import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  valetApi,
  type CreateParkingFloorInput,
  type AssignTaskInput,
  type CreateParkingSpotInput,
  type CreateAttendantInput,
  type CreateClientInput,
  type CreateUnitInput,
  type CreateUnitInvitationInput,
  type CreateVehicleInput,
  type AddClientVehicleInput,
  type ChargeClientInput,
  type MoveParkingSpotInput,
  type PurgeUnitDataInput,
  type RegisterExitInput,
  type RemoveUnitMemberInput,
  type UpdateClientInput,
  type UpdateParkingSpotConfigInput,
  type UpdateUnitMemberRoleInput,
  type UpdateVehicleSpotInput,
} from "@/services/valetApi";

const STALE_TIME = 60_000;

const ALL_KEYS = [
  "vehicles",
  "attendants",
  "parking-spots",
  "transactions",
  "revenue",
  "occupancy",
  "dashboard-stats",
  "activities",
  "clients",
  "units",
  "unit-members",
  "unit-invitations",
] as const;

function useInvalidateCoreQueries() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all(
      ALL_KEYS.map((key) =>
        queryClient.invalidateQueries({
          queryKey: [key],
        }),
      ),
    );
  };
}

export function useVehiclesQuery() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: valetApi.getVehicles,
    staleTime: STALE_TIME,
  });
}

export function useAttendantsQuery() {
  return useQuery({
    queryKey: ["attendants"],
    queryFn: valetApi.getAttendants,
    staleTime: STALE_TIME,
  });
}

export function useParkingSpotsQuery() {
  return useQuery({
    queryKey: ["parking-spots"],
    queryFn: valetApi.getParkingSpots,
    staleTime: STALE_TIME,
  });
}

export function useTransactionsQuery() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: valetApi.getTransactions,
    staleTime: STALE_TIME,
  });
}

export function useRevenueDataQuery() {
  return useQuery({
    queryKey: ["revenue"],
    queryFn: valetApi.getRevenueData,
    staleTime: STALE_TIME,
  });
}

export function useOccupancyDataQuery() {
  return useQuery({
    queryKey: ["occupancy"],
    queryFn: valetApi.getOccupancyData,
    staleTime: STALE_TIME,
  });
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: valetApi.getDashboardStats,
    staleTime: STALE_TIME,
  });
}

export function useActivitiesQuery() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: valetApi.getActivities,
    staleTime: STALE_TIME,
  });
}

export function useClientsQuery() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: valetApi.getClients,
    staleTime: STALE_TIME,
  });
}

export function useUnitsQuery() {
  return useQuery({
    queryKey: ["units"],
    queryFn: valetApi.getUnits,
    staleTime: STALE_TIME,
  });
}

export function useUnitMembersQuery() {
  return useQuery({
    queryKey: ["unit-members"],
    queryFn: valetApi.getUnitMembers,
    staleTime: STALE_TIME,
  });
}

export function useUnitInvitationsQuery() {
  return useQuery({
    queryKey: ["unit-invitations"],
    queryFn: valetApi.getUnitInvitations,
    staleTime: STALE_TIME,
  });
}

export function useCreateVehicleMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => valetApi.createVehicle(input),
    onSuccess: invalidate,
  });
}

export function useRequestVehicleMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (vehicleId: string) => valetApi.requestVehicle(vehicleId),
    onSuccess: invalidate,
  });
}

export function useRegisterVehicleExitMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: RegisterExitInput) => valetApi.registerVehicleExit(input),
    onSuccess: invalidate,
  });
}

export function useAssignTaskMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: AssignTaskInput) => valetApi.assignTask(input),
    onSuccess: invalidate,
  });
}

export function useCreateClientMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateClientInput) => valetApi.createClient(input),
    onSuccess: invalidate,
  });
}

export function useUpdateClientMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => valetApi.updateClient(input),
    onSuccess: invalidate,
  });
}

export function useAddClientVehicleMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: AddClientVehicleInput) => valetApi.addClientVehicle(input),
    onSuccess: invalidate,
  });
}

export function useChargeClientMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: ChargeClientInput) => valetApi.chargeClient(input),
    onSuccess: invalidate,
  });
}

export function useCreateAttendantMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateAttendantInput) => valetApi.createAttendant(input),
    onSuccess: invalidate,
  });
}

export function useUpdateVehicleSpotMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: UpdateVehicleSpotInput) => valetApi.updateVehicleSpot(input),
    onSuccess: invalidate,
  });
}

export function useCreateParkingSpotMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateParkingSpotInput) => valetApi.createParkingSpot(input),
    onSuccess: invalidate,
  });
}

export function useUpdateParkingSpotConfigMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: UpdateParkingSpotConfigInput) => valetApi.updateParkingSpotConfig(input),
    onSuccess: invalidate,
  });
}

export function useCreateParkingFloorMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateParkingFloorInput) => valetApi.createParkingFloor(input),
    onSuccess: invalidate,
  });
}

export function useDeleteParkingFloorMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (floor: number) => valetApi.deleteParkingFloor(floor),
    onSuccess: invalidate,
  });
}

export function useDeleteParkingSpotMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (spotId: string) => valetApi.deleteParkingSpot(spotId),
    onSuccess: invalidate,
  });
}

export function useMoveParkingSpotMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: MoveParkingSpotInput) => valetApi.moveParkingSpot(input),
    onSuccess: invalidate,
  });
}

export function useCreateUnitMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateUnitInput) => valetApi.createUnit(input),
    onSuccess: invalidate,
  });
}

export function useCreateUnitInvitationMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: CreateUnitInvitationInput) => valetApi.createUnitInvitation(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUnitMemberRoleMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: UpdateUnitMemberRoleInput) => valetApi.updateUnitMemberRole(input),
    onSuccess: invalidate,
  });
}

export function useRemoveUnitMemberMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: RemoveUnitMemberInput) => valetApi.removeUnitMember(input),
    onSuccess: invalidate,
  });
}

export function usePurgeUnitDataMutation() {
  const invalidate = useInvalidateCoreQueries();
  return useMutation({
    mutationFn: (input: PurgeUnitDataInput) => valetApi.purgeUnitData(input),
    onSuccess: invalidate,
  });
}
