import { api, delay } from "@/lib/api";

const BASE = "/api/v1/device-management";

function getLocalDevices() {
  return JSON.parse(localStorage.getItem('mockDevices') || '[]');
}

function setLocalDevices(devices) {
  localStorage.setItem('mockDevices', JSON.stringify(devices));
}

export async function listDevices(userId) {
  const url = userId ? `${BASE}/users/${userId}/devices` : `${BASE}/devices`;
  const { data } = await api.get(url);
  return data || [];
}

export async function getDevice(deviceId) {
  const { data } = await api.get(`${BASE}/devices/${deviceId}`);
  return data;
}

export async function createDevice(payload) {
  const { data } = await api.post(`${BASE}/devices`, payload);
  return data;
}

export async function updateDevice(deviceId, payload) {
  const { data } = await api.put(`${BASE}/devices/${deviceId}`, payload);
  return data;
}

export async function deleteDevice(deviceId) {
  await api.delete(`${BASE}/devices/${deviceId}`);
}

export async function updateDeviceStatus(deviceId, status) {
  const { data } = await api.patch(`${BASE}/devices/${deviceId}/status`, { status });
  return data;
}
