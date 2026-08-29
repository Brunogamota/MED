'use server';

import { revalidatePath } from 'next/cache';
import { serverPageContext } from '@/infra/auth/context';
import { createSubmission, generateDefenseForMed } from '@/services/medService';

/**
 * Server actions used by the MED detail screen. They call the same service
 * layer as the REST API, so authorisation, audit and status transitions behave
 * identically whichever entry point is used.
 */

export async function generateDefenseAction(formData: FormData): Promise<void> {
  const medId = String(formData.get('medId') ?? '');
  if (!medId) return;
  const auth = serverPageContext();
  await generateDefenseForMed(auth, medId, { useLlm: formData.get('useLlm') === 'on' });
  revalidatePath(`/meds/${medId}`);
}

export async function createSubmissionAction(formData: FormData): Promise<void> {
  const medId = String(formData.get('medId') ?? '');
  const provider = String(formData.get('provider') ?? 'generic-json');
  if (!medId) return;
  const auth = serverPageContext();
  await createSubmission(auth, medId, { provider });
  revalidatePath(`/meds/${medId}`);
}
