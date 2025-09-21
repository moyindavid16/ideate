import {mastra} from "@/mastra";
import {createUIMessageStream, createUIMessageStreamResponse} from "ai";
import crypto from "crypto";
import z from "zod";

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
  const {prompt, imageBytes, drawingJSON} = await req.json();

  // Convert the object back to Uint8Array properly
  const imageBytesUint8Array = imageBytes ? new Uint8Array(Object.values(imageBytes)) : new Uint8Array();
  const string_image = Buffer.from(imageBytesUint8Array).toString("base64");

  console.log("Received prompt, imageBytes, and drawingJSON");
  console.log([
    {type: "text", text: prompt.text},
    {type: "image", image: `data:image/png;base64,${string_image}`}, // idk what blob needs to get changed to
    {type: "text", text: drawingJSON},
  ]);

  const stream = createUIMessageStream({
    execute: async ({writer}) => {
      // Make the planner work
      const mdAgent = mastra.getAgent("excalidrawMarkdownAgent")

      const plannerAgent = mastra.getAgent("excalidrawPlannerAgent");
      console.log("Got planner agent");
      const plannerResult = await plannerAgent.generate(
        [
          {
            role: "user",
            content: [
              {type: "text", text: prompt.text},
              {type: "image", image: `data:image/png;base64,${string_image}`, mimeType: "image/png"}, // idk what blob needs to get changed to
              {type: "text", text: drawingJSON},
            ],
          },
        ],
        {
          output: z.object({
            drawingPlan: z.string(),
            stepCount: z.number(),
          }),
        },
      );
      console.log("Got planner result");
      const generatorAgent = mastra.getAgent("excalidrawGeneratorAgent");

      const id = crypto.randomUUID();
      writer.write({
        type: "text-start",
        id,
      });

      let currentDrawingPlan = plannerResult.object.drawingPlan;
      let currentDrawingJSON = drawingJSON;

      // Perform the steps for the number of times
      for (let i = 1; i <= plannerResult.object.stepCount; i++) {
        console.log(currentDrawingPlan)
        const updated = await generatorAgent.generate(
          [
            {
              role: "user",
              content: [
                {type: "text", text: generateDrawingPrompt(prompt, currentDrawingPlan)},
                {type: "image", image: `data:image/png;base64,${string_image}`, mimeType: "image/png"},
                {type: "text", text: currentDrawingJSON},
              ],
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
          data: JSON.parse(updated.object.drawingJSON), // JSON
          transient: true,
        });

        currentDrawingPlan = updated.object.updatedDrawingPlan;
        currentDrawingJSON = updated.object.drawingJSON;
      }

      writer.write({
        type: "text-end",
        id,
      });
    },
  });

  return createUIMessageStreamResponse({stream});
}

function generateDrawingPrompt(initialPrompt: string, drawingPlan: string) {
  return `
    INITIAL PROMPT:
    ${initialPrompt}

    PLAN:
    ${drawingPlan}
  `;
}
