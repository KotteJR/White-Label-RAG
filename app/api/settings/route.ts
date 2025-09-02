let current = {
  organizationName: "Acme Corp",
  primaryColor: "#3b82f6",
  secondaryColor: "#10b981",
  logoUrl: "",
  apiKey: "",
  tokenLimit: 100000,
};

export async function GET() {
  return Response.json(current);
}

export async function PUT(request: Request) {
  const body = await request.json();
  current = { ...current, ...body };
  return Response.json(current);
}


