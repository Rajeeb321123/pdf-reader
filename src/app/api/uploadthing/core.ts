import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { pinecone } from "@/lib/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
// we can use other than OpenAi 
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

const f = createUploadthing();


// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    // below should be file type => pdf not image ( default)
    pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
        // Set permissions and file types for this FileRoute
        .middleware(async ({ req }) => {

            const { getUser } = getKindeServerSession();
            const user = getUser();

            if (!user || !user.id) throw new Error('Unauthorized')

            // this return data will be in onUploadComplete as metadata , as it is a middleware. to check hover over onUploadComplete function
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // after adding file to Uploadthind , we can write here any logic.
            // here we will add file to database mysql
            const createdFile = await db.file.create({
                data: {
                    key: file.key,
                    name: file.name,
                    // metadata is what we go as return from middleware above
                    userId: metadata.userId,
                    // sometime uploadthings donot return url, which is stupid from uploadthing, it may return timesout
                    // fix is directly get it from aws s3 which is uses under the hood
                    // after uploadthing fix it we can write file.url instead of this mess
                    url: `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`,
                    // we will processing it futher and later add failure or success
                    uploadStatus: "PROCESSING"
                }
            })

            // indexing the whole pdf look 6:50 of video (imp video) for indexing work ,for Ai can search for the part most similar to question
            // using vector database ( pinecone.io)
            try {
                // we need the pdf file so, we make fetch in above url of uploadthings
                const response = await fetch(`https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`);
                // we need blob object to index it
                const blob = await response.blob();


                // VVV imp:using langchain to index it rather than doing by hand
                // loading pdf to memory
                const loader = new PDFLoader(blob);

                const pageLevelDocs = await loader.load();

                // getting lenght so we take care of free and pro plan
                const pageAmt = pageLevelDocs.length

                // vectorize and index entire element
                const pineconeIndex = pinecone.Index("pdfreader");

                // embedding to generate the vector from text
                const embeddings = new OpenAIEmbeddings({
                    openAIApiKey: process.env.OPENAI_API_KEY,
                })

                // VV IMP: text to vector
                // creating a new instance of Pineconestore from given doc here pdf
                await PineconeStore.fromDocuments(
                    pageLevelDocs,
                    embeddings,
                    {
                        pineconeIndex,
                        // saving vectors to certain neamespace
                        // so, when query by fileId we can get all the vectors of that fileId
                        namespace: createdFile.id,
                    });

                // successful upload and update the file in db as success as we finished processing
                await db.file.update({
                    data: {
                        uploadStatus: "SUCCESS"
                    },
                    where: {
                        id: createdFile.id
                    }
                });

            }
            catch {
                // failed status
                await db.file.update({
                    data: {
                        uploadStatus: "FAILED"
                    },
                    where: {
                        id: createdFile.id
                    }
                });
            }

        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;