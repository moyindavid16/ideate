import {mastra} from "@/mastra";
import {UIMessageStreamWriter} from "ai";
import crypto from "crypto";
import { format } from "path";
import z from "zod";

interface CodeBody {
  prompt: {text: string};
  currentCode: string;
}

export async function handleCodeGen(writer: UIMessageStreamWriter, body: CodeBody) {
  const {prompt, currentCode} = body;
  console.log("Received code");
  const coderAgent = mastra.getAgent("coderAgent");

  console.log([
    {type: "text", text: prompt.text},
    {type: "text", text: currentCode || ""},
  ])

  const stream = await coderAgent.stream(
    [
      {
        role: "user",
        content: [
          {type: "text", text: prompt.text},
          {type: "text", text: "Existing code: " + currentCode || ""},
        ],
      },
    ],
    {
      output: z.object({
        code: z.string(),
        messageToUser: z.string(),
      })
    },
  );
  console.log("Got coder result");

  const id = crypto.randomUUID();

  // writer.merge(stream.toUIMessageStream())
  // return

  writer.write({
    type: "text-start",
    id,
  });

  for await (const chunk of stream.partialObjectStream) {
    if (chunk.code) {
      writer.write({
        type: "data-code",
        data: chunk.code,
        transient: true,
      });
    }
    if (chunk.messageToUser) {
      writer.write({
        type: "text-delta",
        id,
        delta: chunk.messageToUser || "",
      });
    }
  }

  writer.write({
    type: "text-end",
    id,
  });
}
