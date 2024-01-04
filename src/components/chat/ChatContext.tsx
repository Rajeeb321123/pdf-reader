import { ReactNode, createContext, useRef, useState } from "react";
import { useToast } from "../ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";

type StreamResponse = {
    addMessage: () => void,
    message: string,
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void,
    isLoading: boolean,
}

export const ChatContext = createContext<StreamResponse>({
    addMessage: () => { },
    message: '',
    handleInputChange: () => { },
    isLoading: false,
});

interface Props {
    fileId: string;
    children: ReactNode;
}

export const ChatContextProvider = ({ fileId, children }: Props) => {
    // logic
    const [message, setMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const utils = trpc.useContext()

    const { toast } = useToast();

    // very imp: Trpc only work for json so we are using just tanstack here.
    // here we want to stream back the response so , trpc doesnot work

    // sending the message
    const backupMessage = useRef('');
    const { mutate: sendMessage } = useMutation({
        mutationFn: async ({ message }: { message: string }) => {
            const response = await fetch('/api/message', {
                method: 'POST',
                body: JSON.stringify({
                    fileId,
                    message,
                }),
            })
            if (!response.ok) {
                throw new Error("Failed to send message");
            };
            return response.body
        },

        // VERY VVV imp: optimistic update
        // We are going to add user question in messages, even before the response from ai, then if response error  then roll back the message to input box
        onMutate: async ({ message }) => {
            // save the message as backup if we rollback needed
            backupMessage.current = message;
            setMessage('');

            // step 1 for optimistic update: cancel all other outbound calls
            await utils.getFileMessages.cancel();

            // step2 : get data so we can revert back later
            const previousMessages = utils.getFileMessages.getInfiniteData();

            // step 3 : 
            utils.getFileMessages.setInfiniteData({
                fileId,
                limit: INFINITE_QUERY_LIMIT
            },
                (old) => {
                    if (!old) {
                        return {
                            // why pages: react-query just need it
                            pages: [],
                            pageParams: [],
                        }
                    }

                    let newPages = [...old.pages]

                    // latest page contain latest 10 message. just populating the page latest page var with newPages[0] info
                    let latestPage = newPages[0]!;

                    // moving the all prev message up 1 and putting our message as latest message
                    latestPage.messages = [
                        {
                            createdAt: new Date().toISOString(),
                            id: crypto.randomUUID(),
                            text: message,
                            isUserMessage: true,
                        },
                        ...latestPage.messages
                    ]

                    // updating the newPage[0] with latestPage with our message : injecting
                    newPages[0] = latestPage;

                    return {
                        ...old,
                        pages: newPages,
                    };
                }
            );

            // we want loading message after user message injection or optimistic update
            setIsLoading(true);

            return {
                previousMessage: previousMessages?.pages.flatMap((page) => page.messages) ?? []
            }
        },
        //VERY VERY VVIMP: 2nd part of optimistic uptate. stream provide realtime feeling
        onSuccess: async (stream) => {
            setIsLoading(false);
            if (stream === null) {
                return toast ({
                    title: "There was a problem sending this message",
                    description: "Please refresh this page and try again",
                    variant: "destructive",
                });
            };

            // we get sream of data from backend
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let done = false;

            // accumulated response
            let accResponse = '';
            while (!done) {
                // read the stream
                const { value, done:doneReading } =  await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value);

                // append chunkValue
                accResponse += chunkValue; 

                // VVV imp:append chunk to actual message : OPTIMISTIC update
                utils.getFileMessages.setInfiniteData({
                    fileId,
                    limit: INFINITE_QUERY_LIMIT
                },
                    (old) => {
                        if (!old) return {pages:[], pageParams:[]}

                        // The some() method of Array instances tests whether at least one element in the array passes the test implemented by the provided function. return boolean
                        let isAiResponseCreated = old.pages.some(
                            (page) => page.messages.some((message) => message.id === 'ai-response')
                        );

                        // for each chunk we check is there a message already , ifnot we create one, otherwise we add chunk to message

                        // map over old pages first
                        let updatedPages = old.pages.map((page) => {

                            // if first page consist the last message, remember order is reversed
                            if (page === old.pages[0]) {
                                let updatedMessages;

                                // if no ai response yet we create one
                                if (!isAiResponseCreated) {
                                    updatedMessages = [
                                        {
                                            createdAt: new Date().toISOString(),
                                            id: "ai-response",
                                            isUserMessage: false,
                                            text: accResponse,
                                        },
                                        ...page.messages
                                    ]
                                }
                                // if there is already message, then we add incoming chunks to messages
                                else {
                                    updatedMessages = page.messages.map((message) => {
                                        if (message.id === 'ai-response') {
                                            return {
                                                ...message,
                                                text: accResponse,
                                            }
                                        }
                                        return message
                                    })
                                }

                                return  {
                                    ...page,
                                    messages: updatedMessages
                                }
                            };

                            // if not first page then just return the page
                            return page
                        });

                        // spread the old value and udate with new value
                        return { ...old, pages: updatedPages }
                    }
                )
            }



        },
        // we dont want 1st and 2nd but third arg. syntax should be like below
        onError: (_, __, context) => {
            // VV imp: if error after optimistic update, we
            // imP: setting the input bar again with user question 
            setMessage(backupMessage.current);
            utils.getFileMessages.setData(
                { fileId },
                { messages: context?.previousMessage ?? [] }
            )
        },
        onSettled: async () => {
            setIsLoading(false);
            // invalidate refresh the page
            await utils.getFileMessages.invalidate({fileId})
        }
    });

    // add message
    // sendingMessage to backend look above in  mutate: sendMessage for ai
    // using add message and context api we can use add message anywhere like in chatINput.tsx
    const addMessage = () => sendMessage({ message });

    // handle inputChange
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
    };



    return (
        <ChatContext.Provider value={{
            addMessage,
            message,
            handleInputChange,
            isLoading
        }}>
            {children}
        </ChatContext.Provider>
    )


}