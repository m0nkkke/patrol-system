export const ACTOR_FULL_NAME_REQUIRED_CODE = 'AUTH_ACTOR_FULL_NAME_REQUIRED';

export function requiresActorFullName(errorCode: string): boolean {
  return errorCode === ACTOR_FULL_NAME_REQUIRED_CODE;
}
