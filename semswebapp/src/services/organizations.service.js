import { api, DEMO_MODE, delay } from "@/lib/api";
import { demoOrganization, demoSites, demoZones, demoMembers } from "@/lib/demo";

// Modulo de organizaciones del backend. Las rutas no comparten un prefijo
// unico: las de organizacion cuelgan de /organizations, las de zona de /sites
// y /zones. Por eso aqui se escriben completas.
const BASE = "/api/v1";

// Este modulo habla snake_case en ambos sentidos, a diferencia del de
// dispositivos. Los nombres se traducen aqui para que las vistas trabajen
// siempre en camelCase.

/** @returns {import("../types").Organization} */
function mapOrganization(o) {
  return {
    organizationId: o.organization_id,
    legalName: o.legal_name,
    tradeName: o.trade_name ?? "",
    taxId: o.tax_id,
    businessType: o.business_type,
    status: o.status,
  };
}

/** @returns {import("../types").Site} */
function mapSite(s) {
  return {
    siteId: s.site_id,
    organizationId: s.organization_id,
    siteCode: s.site_code,
    name: s.name,
    address: s.address ?? "",
    district: s.district ?? "",
    floorAreaM2: s.floor_area_m2 ?? null,
    contractedPowerKw: Number(s.contracted_power_kw ?? 0),
    tariffCategory: s.tariff_category,
    chargesForDemand: Boolean(s.charges_for_demand),
    excludesSundaysFromPeak: Boolean(s.excludes_sundays_from_peak),
    status: s.status,
  };
}

/** @returns {import("../types").Zone} */
function mapZone(z) {
  return {
    zoneId: z.zone_id,
    siteId: z.site_id,
    name: z.name,
    zoneType: z.zone_type,
    operatesOffHours: Boolean(z.operates_off_hours),
    status: z.status,
  };
}

/**
 * La organizacion del usuario, o null si todavia no registro ninguna.
 *
 * El backend devuelve una lista de membresias; aqui interesa la primera, que es
 * la organizacion que el usuario administra. Soportar varias organizaciones por
 * usuario es otra historia y no hace falta para el alta.
 *
 * @returns {Promise<import("../types").Organization | null>}
 */
export async function getMyOrganization(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoOrganization;
  }
  const { data } = await api.get(`${BASE}/users/${userId}/organizations`);
  const first = (data ?? [])[0];
  return first?.organization ? mapOrganization(first.organization) : null;
}

export async function createOrganization({ legalName, tradeName, taxId, businessType, ownerUserId }) {
  if (DEMO_MODE) {
    await delay();
    return { ...demoOrganization, legalName, tradeName, taxId, businessType };
  }
  const { data } = await api.post(`${BASE}/organizations`, {
    legal_name: legalName,
    trade_name: tradeName || null,
    tax_id: taxId,
    business_type: businessType,
    owner_user_id: ownerUserId,
  });
  return mapOrganization(data);
}

export async function updateOrganization(organizationId, { legalName, tradeName, businessType }) {
  if (DEMO_MODE) {
    await delay();
    return { ...demoOrganization, legalName, tradeName, businessType };
  }
  const { data } = await api.put(`${BASE}/organizations/${organizationId}`, {
    legal_name: legalName,
    trade_name: tradeName || null,
    business_type: businessType,
  });
  return mapOrganization(data);
}

/** @returns {Promise<import("../types").Site[]>} */
export async function listSites(organizationId) {
  if (DEMO_MODE) {
    await delay();
    return demoSites;
  }
  const { data } = await api.get(`${BASE}/organizations/${organizationId}/sites`);
  return (data ?? []).map(mapSite);
}

function sitePayload(s) {
  return {
    site_code: s.siteCode,
    name: s.name,
    address: s.address || null,
    district: s.district || null,
    floor_area_m2: s.floorAreaM2 === "" || s.floorAreaM2 == null ? null : Number(s.floorAreaM2),
    contracted_power_kw: Number(s.contractedPowerKw),
    tariff_category: s.tariffCategory,
    excludes_sundays_from_peak: Boolean(s.excludesSundaysFromPeak),
  };
}

export async function createSite(organizationId, site) {
  if (DEMO_MODE) {
    await delay();
    return { ...site, siteId: crypto.randomUUID(), organizationId, status: "ACTIVE" };
  }
  const { data } = await api.post(`${BASE}/organizations/${organizationId}/sites`, sitePayload(site));
  return mapSite(data);
}

export async function updateSite(siteId, site) {
  if (DEMO_MODE) {
    await delay();
    return { ...site, siteId };
  }
  // El codigo del local no se puede cambiar: identifica la sede, y el endpoint
  // de actualizacion no lo acepta.
  const cuerpo = sitePayload(site);
  delete cuerpo.site_code;
  const { data } = await api.put(`${BASE}/sites/${siteId}`, cuerpo);
  return mapSite(data);
}

/** Archiva el local. El backend no lo borra: le cambia el estado. */
export async function archiveSite(siteId) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.delete(`${BASE}/sites/${siteId}`);
}

/** @returns {Promise<import("../types").Zone[]>} */
export async function listZones(siteId) {
  if (DEMO_MODE) {
    await delay(200);
    return demoZones.filter((z) => z.siteId === siteId);
  }
  const { data } = await api.get(`${BASE}/sites/${siteId}/zones`);
  return (data ?? []).map(mapZone);
}

export async function createZone(siteId, { name, zoneType, operatesOffHours }) {
  if (DEMO_MODE) {
    await delay(200);
    return { zoneId: crypto.randomUUID(), siteId, name, zoneType, operatesOffHours, status: "ACTIVE" };
  }
  const { data } = await api.post(`${BASE}/sites/${siteId}/zones`, {
    name,
    zone_type: zoneType,
    operates_off_hours: Boolean(operatesOffHours),
  });
  return mapZone(data);
}

/** Archiva la zona. Igual que el local, cambia de estado en lugar de borrarse. */
export async function archiveZone(zoneId) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.delete(`${BASE}/zones/${zoneId}`);
}

/** @returns {import("../types").Membership} */
function mapMembership(m) {
  return {
    membershipId: m.membership_id,
    userId: m.user_id,
    // Puede venir nulo si la cuenta se borro y el vinculo quedo huerfano.
    email: m.email ?? null,
    role: m.role,
    siteId: m.site_id ?? null,
    status: m.status,
  };
}

/** @returns {Promise<import("../types").Membership[]>} */
export async function listMembers(organizationId) {
  if (DEMO_MODE) {
    await delay();
    return demoMembers;
  }
  const { data } = await api.get(`${BASE}/organizations/${organizationId}/members`);
  return (data ?? []).map(mapMembership);
}

/**
 * Da acceso a alguien, o cambia el que ya tenia.
 *
 * El backend acepta el correo y lo traduce a identificador: quien administra la
 * organizacion conoce el correo de sus companeros, no su UUID. Si no hay nadie
 * registrado con ese correo responde 404.
 *
 * El alcance lo valida el dominio: un ORG_ADMIN no puede atarse a un local, y
 * un SUPERVISOR tiene que tener uno.
 */
export async function grantMembership(organizationId, { email, role, siteId }) {
  if (DEMO_MODE) {
    await delay();
    return { membershipId: crypto.randomUUID(), userId: crypto.randomUUID(), email, role, siteId: siteId || null, status: "ACTIVE" };
  }
  const { data } = await api.post(`${BASE}/organizations/${organizationId}/members`, {
    email,
    role,
    site_id: siteId || null,
  });
  return mapMembership(data);
}

/** Revoca el acceso de una persona a la organizacion. */
export async function revokeMembership(organizationId, membershipId) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.delete(`${BASE}/organizations/${organizationId}/members/${membershipId}`);
}
