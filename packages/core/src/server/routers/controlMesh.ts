import { z } from "zod";
import { getControlMesh, getControlDetail } from "../../lib/control-mesh";

export const createControlMeshRouter = (t: any, clientProcedure: any) => {
  return t.router({
    getGraph: clientProcedure
      .input(z.object({ clientId: z.number(), frameworkCode: z.string().optional() }))
      .query(async ({ input }) => getControlMesh(input.clientId, input.frameworkCode)),
    getDetail: clientProcedure
      .input(z.object({ clientId: z.number(), controlId: z.number() }))
      .query(async ({ input }) => getControlDetail(input.clientId, input.controlId)),
  });
};
