import { db } from "@/db";
import { openai } from "@/lib/open";
import { pinecone } from "@/lib/pinecone";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { NextRequest } from "next/server";
import {OpenAIStream, StreamingTextResponse } from 'ai';

export const POST = async (req: NextRequest) => {
    // endpoint for asking question to pdf
    const body = await req.json();

    const { getUser } = getKindeServerSession();
    const user = getUser();

    const { id: userId } = user;

    if (!userId) return new Response("Unauthorized", { status: 401 });

    // validate any request with SendMessageValidator.ts in validator of libs folder
    // validator make sure fileId and message is always present in request, otherwise automatically throw error
    const { fileId, message } = SendMessageValidator.parse(body);

    const file = await db.file.findFirst({
        where: {
            id: fileId,
            userId,
        },
    })

    if (!file) return new Response('Not found', { status: 404 });

    await db.message.create({
        data: {
            text: message,
            isUserMessage: true,
            userId,
            fileId,
        }
    });

    //VVV imp:  for Ai knowlege , semantic query 6:50 of video (imp video)
    // vectorize message
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const pineconeIndex = pinecone.Index('pdfreader');

    // getting new instance of pineconestore: or vectorstore from existing index
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace: file.id
    });

    // MOST VVVVV IMP getting 4 closest results to  our message from pdf , you can set it to any number, here we only used 4. Example for pro user more than 4 can be used for better result. Remember this isnot  last previous history checking of message, we check similarity from our pdf pages
    const results = await vectorStore.similaritySearch(message, 4);
    // console.log("simialrity : ",results)

    // see the previous message if there is chat history
    const prevMessages = await db.message.findMany({
        where: {
            fileId
        },
        orderBy: {
            createdAt: "asc"
        },
        // only taking last 6 message
        take: 6
    })

    // OpenAI is expect our message in certain format
    // setting the history message in formatted form with role (user or assistant)
    const formattedPrevMessages = prevMessages.map((msg) => ({
        role: msg.isUserMessage ? "user" as const : "assistant" as const,
        content: msg.text,
    }));

    // response from large language model openai
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        stream: true,
        temperature: 0,

        // below is just prompt , nothing more , 
        messages: [
            {
                role: 'system',
                content:
                    'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
            },
            {
                role: 'user',
                content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
              
        \n----------------\n
        
        PREVIOUS CONVERSATION:
        ${formattedPrevMessages.map((message) => {
                    if (message.role === 'user') return `User: ${message.content}\n`
                    return `Assistant: ${message.content}\n`
                })}
        
        \n----------------\n
        
        CONTEXT:
        ${results.map((r) => r.pageContent).join('\n\n')}
        
        USER INPUT: ${message}`,
            },
        ],
    });

    // VVIMP : AI PACKGE FROM VERCEL: for streaming ai response realtime back to client we use ai package from vercel,
    // this can also be done manually but ai package is better,
    // Imp: streaming chunk back to client
    const stream = OpenAIStream(response, {
        // after sending as chunks to client we get complete respnse as one we save it on database
        async onCompletion(completion) {
            await db.message.create({
                data: {
                    text: completion,
                    isUserMessage: false,
                    fileId,
                    userId,
                }
            });
        }
    });

    return new StreamingTextResponse(stream)


}