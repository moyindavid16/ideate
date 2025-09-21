import {mastra} from "@/mastra";
import {UIMessageStreamWriter} from "ai";
import z from "zod";

interface MdBody {
  prompt: {text: string};
  markdownData: string;
}

export async function mdhandle(writer: UIMessageStreamWriter, body: MdBody) {
  console.log("Received markdown");
  const {prompt, markdownData} = body;
  console.log(prompt, markdownData);
  const mdAgent = mastra.getAgent("excalidrawMarkdownAgent");
  const mdResult = await mdAgent.stream(
    [
      {
        role: "user",
        content: [
          {type: "text", text: prompt.text},
          {type: "text", text: markdownData},
        ],
      },
    ],
    {
      output: z.object({
        markdown: z.string(),
        messageToUser: z.string(),
      }),
    },
  );

  console.log(mdResult);

  const id = crypto.randomUUID();

  writer.write({
    type: "text-start",
    id,
  });

  for await (const chunk of mdResult.partialObjectStream) {
    // if (chunk.markdown) {
    //   writer.write({
    //     type: "data-markdown",
    //     data: chunk.markdown,
    //     transient: true,
    //   });
    // } else {
    writer.write({
      type: "text-delta",
      id,
      delta: chunk || "",
    });
    // }
  }

  writer.write({
    type: "text-end",
    id,
  });
}
