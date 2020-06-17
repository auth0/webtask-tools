declare module "webtask-tools" {
  import { IncomingMessage, ServerResponse, Server } from "http";

  // As per https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/micro/index.d.ts
  export type RequestHandler = (
    req: IncomingMessage,
    res: ServerResponse
  ) => any;

  export function fromConnect(app: RequestHandler): any;

  export function fromExpress(app: RequestHandler): any;
}
