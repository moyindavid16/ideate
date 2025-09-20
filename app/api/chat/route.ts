import {mastra} from "@/mastra";
import {createUIMessageStream, createUIMessageStreamResponse} from "ai";
import z from "zod";
import crypto from "crypto";

/**
 * When the user sends in a request (via doodle buddy), we:
 * - get the current state
 * - get an image of the canvas
 * - generate a todo list of things to draw
 * - execute each step in sequence, immediately uploading the results
 *    - each upload is a new JSON
 */
export async function POST(req: Request) {
  const {prompt, messages} = await req.json();

  const stream = createUIMessageStream({
    execute: async ({writer}) => {
      const plannerAgent = mastra.getAgent("excalidrawPlannerAgent");
      const plannerResult = await plannerAgent.generate(
        [
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          output: z.object({
            drawingPlan: z.string(),
            stepCount: z.number(),
          }),
        },
      );

      const generatorAgent = mastra.getAgent("excalidrawGeneratorAgent");

      const id = crypto.randomUUID();
      writer.write({
        type: "text-start",
        id,
      });

      let currentDrawingPlan = plannerResult.object.drawingPlan;

      for (let i = 1; i <= plannerResult.object.stepCount; i++) {
        const updated = await generatorAgent.generate(
          [
            {
              role: "user",
              content: generateDrawingPrompt(prompt, currentDrawingPlan),
            },
          ],
          {
            output: z.object({
              drawingJSON: z.string(),
              messageToUser: z.string(),
              updatedDrawingPlan: z.string(),
            }),
          },
        );

        // write the message
        writer.write({
          type: "text-delta",
          id,
          delta: updated.object.messageToUser || "",
        });
        // write the json (temporarily)
        writer.write({
          type: "data-excalidraw-json",
          data: updated.object.drawingJSON,
          transient: true,
        });

        currentDrawingPlan = updated.object.updatedDrawingPlan;
      }
      
      writer.write({
        type: "text-end",
        id,
      });
    },
  });

  return createUIMessageStreamResponse({stream})
}

function generateDrawingPrompt(initialPrompt: string, drawingPlan: string) {
  return initialPrompt + "\n\n" + drawingPlan;
}
