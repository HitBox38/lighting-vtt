export type TokenTemplateDisplay = {
  id: string;
  name: string;
  imageUrl: string;
  borderColor: string;
};

export type TokenInstanceDisplay = { id: string; templateId: string };

export type AssignedToken = { instanceId: string; template: TokenTemplateDisplay };
