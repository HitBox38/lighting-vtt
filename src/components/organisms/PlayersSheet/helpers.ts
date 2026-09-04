import type {
  AssignedToken,
  TokenInstanceDisplay,
  TokenTemplateDisplay,
} from "@/components/organisms/PlayersSheet/types";

export const resolveAssignedTokens = (
  tokenInstanceIds: string[],
  tokenInstances: TokenInstanceDisplay[],
  tokenTemplates: TokenTemplateDisplay[],
): AssignedToken[] => {
  const instanceById = new Map(tokenInstances.map((instance) => [instance.id, instance]));
  const templateById = new Map(tokenTemplates.map((template) => [template.id, template]));
  const assigned: AssignedToken[] = [];

  for (const tokenId of tokenInstanceIds) {
    const instance = instanceById.get(tokenId);
    const template = instance ? templateById.get(instance.templateId) : undefined;
    if (instance && template) {
      assigned.push({ instanceId: tokenId, template });
    }
  }

  return assigned;
};

export const resolveUnassignedTokens = (
  assignedIds: Set<string>,
  tokenInstances: TokenInstanceDisplay[],
  tokenTemplates: TokenTemplateDisplay[],
): AssignedToken[] => {
  const templateById = new Map(tokenTemplates.map((template) => [template.id, template]));
  const unassigned: AssignedToken[] = [];

  for (const instance of tokenInstances) {
    if (assignedIds.has(instance.id)) {
      continue;
    }
    const template = templateById.get(instance.templateId);
    if (template) {
      unassigned.push({ instanceId: instance.id, template });
    }
  }

  return unassigned;
};
