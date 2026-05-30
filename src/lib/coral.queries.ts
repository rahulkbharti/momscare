// coral.queries.ts
// SQL query builders for mom-care Coral sources

/** All prescriptions for a specific patient record */
export function getPrescriptionsQuery(recordId: string): string {
  return `SELECT record_id, medicine_name, dosage, frequency, timings, instructions
FROM momcare_prescriptions.prescriptions
WHERE record_id = '${escapeId(recordId)}'`;
}

/** All conditions for a specific patient record */
export function getConditionsQuery(recordId: string): string {
  return `SELECT record_id, condition
FROM momcare_conditions.conditions
WHERE record_id = '${escapeId(recordId)}'`;
}

/** All appointments for a specific patient record */
export function getAppointmentsQuery(recordId: string): string {
  return `SELECT record_id, appointment_date, appointment_time, status, reason
FROM momcare_appointments.appointments
WHERE record_id = '${escapeId(recordId)}'
ORDER BY appointment_date ASC`;
}

/** Patient profile info */
export function getPatientQuery(recordId: string): string {
  return `SELECT record_id, name, age, gender, phone, doctor_name, extracted_at
FROM momcare_patients.patients
WHERE record_id = '${escapeId(recordId)}'
LIMIT 1`;
}

/** Insurance info for a patient */
export function getInsuranceQuery(recordId: string): string {
  return `SELECT record_id, provider_name, policy_number, coverage_amount, expiry_date, status
FROM momcare_insurance.insurance
WHERE record_id = '${escapeId(recordId)}'`;
}

/**
 * The POWER query — JOINs patients + prescriptions + conditions for a record.
 * This is the doctor visit packet base query.
 */
export function getDoctorPacketJoinQuery(recordId: string): string {
  const pid = escapeId(recordId);
  return `SELECT
  p.name,
  p.age,
  p.gender,
  p.doctor_name,
  rx.medicine_name,
  rx.dosage,
  rx.frequency,
  rx.timings,
  rx.instructions,
  c.condition,
  a.appointment_date,
  a.appointment_time,
  a.reason AS appointment_reason,
  a.status AS appointment_status
FROM momcare_patients.patients p
LEFT JOIN momcare_prescriptions.prescriptions rx ON rx.record_id = p.record_id
LEFT JOIN momcare_conditions.conditions c ON c.record_id = p.record_id
LEFT JOIN momcare_appointments.appointments a ON a.record_id = p.record_id
WHERE p.record_id = '${pid}'`;
}

/** Cross-patient analytics — most common conditions across ALL records */
export function getCommonConditionsQuery(): string {
  return `SELECT condition, COUNT(*) AS patient_count
FROM momcare_conditions.conditions
GROUP BY condition
ORDER BY patient_count DESC
LIMIT 10`;
}

/** Cross-patient analytics — most commonly prescribed medicines */
export function getCommonMedicinesQuery(): string {
  return `SELECT medicine_name, COUNT(*) AS prescribed_count
FROM momcare_prescriptions.prescriptions
GROUP BY medicine_name
ORDER BY prescribed_count DESC
LIMIT 10`;
}

/** All patients overview */
export function getAllPatientsQuery(): string {
  return `SELECT record_id, name, age, gender, doctor_name, extracted_at
FROM momcare_patients.patients
ORDER BY extracted_at DESC`;
}

function escapeId(id: string): string {
  // Only allow alphanumeric, dash, underscore (MongoDB IDs)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid record ID: ${id}`);
  }
  return id;
}
