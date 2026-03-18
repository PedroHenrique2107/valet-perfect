import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type UserRole = "leader" | "attendant" | "cashier";

interface CreateUnitUserPayload {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: UserRole;
  unitId?: string | null;
  workPeriodStart?: string;
  workPeriodEnd?: string;
  maxWorkHours?: number;
  sendInviteEmail?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase edge function sem configuracao de ambiente." }, 500);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Cabecalho de autorizacao ausente." }, 401);
    }

    const body = (await request.json()) as CreateUnitUserPayload;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;
    const role = body.role;
    const workPeriodStart = body.workPeriodStart ?? "08:00";
    const workPeriodEnd = body.workPeriodEnd ?? "17:00";
    const maxWorkHours = Number(body.maxWorkHours ?? 8);
    const sendInviteEmail = body.sendInviteEmail ?? true;

    if (!name || !email || !role) {
      return jsonResponse({ error: "Nome, e-mail e funcao sao obrigatorios." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
    const {
      data: { user: requester },
      error: requesterError,
    } = await adminClient.auth.getUser(jwt);

    if (requesterError || !requester) {
      return jsonResponse({ error: "Sessao invalida para criar usuarios." }, 401);
    }

    const { data: requesterRoles, error: rolesError } = await adminClient
      .from("user_unit_roles")
      .select("unit_id, role")
      .eq("user_id", requester.id);

    if (rolesError || !requesterRoles || requesterRoles.length === 0) {
      return jsonResponse({ error: "Usuario sem permissao para gerenciar unidades." }, 403);
    }

    const targetUnitId = body.unitId ?? requesterRoles[0].unit_id;
    const canManageUnit = requesterRoles.some((item) => item.unit_id === targetUnitId && (item.role === "admin" || item.role === "leader"));
    if (!canManageUnit) {
      return jsonResponse({ error: "Voce nao possui permissao para criar usuarios nesta unidade." }, 403);
    }

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();

    let createdUserId = existingProfile?.id ?? null;

    if (!createdUserId) {
      const inviteResponse = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: name,
          name,
          phone,
          role,
          unit_id: targetUnitId,
        },
      });

      if (inviteResponse.error || !inviteResponse.data.user) {
        return jsonResponse({ error: inviteResponse.error?.message ?? "Nao foi possivel convidar o usuario." }, 400);
      }

      createdUserId = inviteResponse.data.user.id;

    }

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: createdUserId,
      full_name: name,
      email,
      phone,
    });

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 400);
    }

    const { error: roleError } = await adminClient.from("user_unit_roles").insert({
      user_id: createdUserId,
      unit_id: targetUnitId,
      role,
    });

    if (roleError && !roleError.message.toLowerCase().includes("duplicate")) {
      return jsonResponse({ error: roleError.message }, 400);
    }

    const { data: invitation, error: invitationError } = await adminClient
      .from("unit_invitations")
      .insert({
        unit_id: targetUnitId,
        name,
        email,
        phone,
        role,
        status: "linked",
        work_period_start: workPeriodStart,
        work_period_end: workPeriodEnd,
        max_work_hours: maxWorkHours,
        created_by: requester.id,
      })
      .select("id, unit_id, status")
      .single();

    if (invitationError) {
      return jsonResponse({ error: invitationError.message }, 400);
    }

    return jsonResponse({
      userId: createdUserId,
      invitationId: invitation.id,
      unitId: invitation.unit_id,
      status: invitation.status,
      email,
      name,
      inviteEmailSent: sendInviteEmail,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Erro inesperado ao criar usuario.",
      },
      500,
    );
  }
});
