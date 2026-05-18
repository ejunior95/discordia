import { SetMetadata } from '@nestjs/common';
import { OrchestratorEndpoint } from './orchestrator.types';

export const ORCHESTRATOR_TARGET_KEY = 'orchestratorTarget';

export const OrchestratorTarget = (endpoint: OrchestratorEndpoint) =>
  SetMetadata(ORCHESTRATOR_TARGET_KEY, endpoint);
