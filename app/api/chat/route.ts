import {mastra} from "@/mastra";
import {createUIMessageStream, createUIMessageStreamResponse, ImagePart} from "ai";
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
  const {prompt, imagebytes, drawingJSON} = await req.json();

  const stream = createUIMessageStream({
    execute: async ({writer}) => {
      // Make the planner work
      const plannerAgent = mastra.getAgent("excalidrawPlannerAgent");
      const plannerResult = await plannerAgent.generate(
        [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: `data:image/png;base64,${imagebytes}` }, // idk what blob needs to get changed to
              { type: "text", text: drawingJSON }
            ]
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
      let currentDrawingJSON = drawingJSON

      // Perform the steps for the number of times
      for (let i = 1; i <= plannerResult.object.stepCount; i++) {
        const updated = await generatorAgent.generate(
          [
            {
              role: "user",
              content: [
                { type: "text", text: generateDrawingPrompt(prompt, currentDrawingPlan)},
                { type: "image", image: `data:image/png;base64,${imagebytes}` },
                { type: "text", text: currentDrawingJSON }
              ]
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

  return createUIMessageStreamResponse({stream})
}

function generateDrawingPrompt(initialPrompt: string, drawingPlan: string) {
  return `
    INITIAL PROMPT:
    ${initialPrompt}

    PLAN:
    ${drawingPlan}
  `;
}
