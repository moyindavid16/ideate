import {mastra} from "@/mastra";
import {UIMessageStreamWriter} from "ai";
import crypto from "crypto";
import z from "zod";

interface CodeBody {
  prompt: {text: string};
  currentCode: string;
}

// Alternative streaming approach - streams the actual generation process
export async function handleCodeGenStreaming(writer: UIMessageStreamWriter, body: CodeBody) {
  const {prompt, currentCode} = body;
  console.log("Received code generation request");
  const coderAgent = mastra.getAgent("coderAgent");

  const id = crypto.randomUUID();

  try {
    // Start the text stream
    writer.write({
      type: "text-start",
      id,
    });

    // Use streamVNext for true streaming
    const stream = await coderAgent.streamVNext(
      [
        {
          role: "user",
          content: [
            {type: "text", text: prompt.text},
            {type: "text", text: currentCode || ""},
          ],
        },
      ],
      {
        output: z.object({
          code: z.string(),
          messageToUser: z.string(),
        }),
        format: "aisdk",
      },
    );

    console.log("Got coder stream");

    // Stream the text content as it's generated
    for await (const chunk of stream.textStream) {
      writer.write({
        type: "text-delta",
        id,
        delta: chunk,
      });
    }

    // Get the final result for the code data
    const result = await stream.result;

    // Send the code data
    if (result.object.code) {
      writer.write({
        type: "data-code",
        data: result.object.code,
        transient: true,
      });
    }

    // End the text stream
    writer.write({
      type: "text-end",
      id,
    });
  } catch (error) {
    console.error("Error in code generation:", error);

    // Send error message
    writer.write({
      type: "text-delta",
      id,
      delta: "Sorry, there was an error generating the code. Please try again.",
    });

    writer.write({
      type: "text-end",
      id,
    });
  }
}

// Current implementation - generates then streams the result
export async function handleCodeGen(writer: UIMessageStreamWriter, body: CodeBody) {
  const {prompt, currentCode} = body;
  console.log("Received code generation request");
  const coderAgent = mastra.getAgent("coderAgent");

  const id = crypto.randomUUID();

  try {
    // Start the text stream
    writer.write({
      type: "text-start",
      id,
    });

    // Generate the code using the agent
    const result = await coderAgent.generate(
      [
        {
          role: "user",
          content: [
            {type: "text", text: prompt.text},
            {type: "text", text: currentCode || ""},
          ],
        },
      ],
      {
        output: z.object({
          code: z.string(),
          messageToUser: z.string(),
        }),
      },
    );

    console.log("Got coder result");

    // Stream the message to user first
    if (result.object.messageToUser) {
      writer.write({
        type: "text-delta",
        id,
        delta: result.object.messageToUser,
      });
    }

    // Then send the code data
    if (result.object.code) {
      writer.write({
        type: "data-code",
        data: result.object.code,
        transient: true,
      });
    }

    // End the text stream
    writer.write({
      type: "text-end",
      id,
    });
  } catch (error) {
    console.error("Error in code generation:", error);

    // Send error message
    writer.write({
      type: "text-delta",
      id,
      delta: "Sorry, there was an error generating the code. Please try again.",
    });

    writer.write({
      type: "text-end",
      id,
    });
  }
}
