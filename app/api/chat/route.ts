import {mastra} from "@/mastra";
import {createUIMessageStream, createUIMessageStreamResponse} from "ai";
import crypto from "crypto";
import z from "zod";
import { mdhandle } from "./mdhandler";
import { handleDraw } from "./drawer";
import { handleCodeGen } from "./coder";

/**
 * When the user sends in a request (via doodle buddy), we:
 * - get the current state
 * - get an image of the canvas
 * - generate a todo list of things to draw
 * - execute each step in sequence, immediately uploading the results
 *    - each upload is a new JSON
 */
export async function POST(req: Request) {
  console.log("Entered api/chat/route.ts");
  const body = await req.json();

  const stream = createUIMessageStream({
    execute: async ({writer}) => {
      console.log("BODY TYPE", body.type)
      if (body.type == "markdown") {
        await mdhandle(writer, body)
      }
      else if (body.type == "code") {
        await handleCodeGen(writer, body)
      }
      else if (body.type == "visual") {
        await handleDraw(writer, body)
      }
    },
  });

  return createUIMessageStreamResponse({stream});
}