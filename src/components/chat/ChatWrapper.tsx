"use client";
// VV imp: we will apply infinite queries and opetimistc result in this section
// they are most imp part of this project

import { trpc } from "@/app/_trpc/client"
import ChatInput from "./ChatInput"
import Messages from "./Messages"
import { ChevronLeft, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { ChatContextProvider } from "./ChatContext";

interface ChatWrapperProps {
    fileId: string;
}

const ChatWrapper = ({ fileId }: ChatWrapperProps) => {

    // getting status of file
    const {data, isLoading } = trpc.getFileUploadStatus.useQuery({
        fileId,
    }, {
        // Polling until getfileUploadStatus is success or Failed
        refetchInterval: (data) => {
            return (data?.status === 'SUCCESS' || data?.status === 'FAILED' ?
                false :
                // but it is in processing or pending we want again polling at 500 delay
                500
            );
        }
    });

    // For different state
    if ( isLoading ) {
        return (
            <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
                <div className="flex-1 flex justify-center items-center flex-col mb-28">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2  className="h-8 w-8 text-blue-500 animate-spin"/>
                        <h3 className="font-semibold text-xl">Loading...</h3>
                        <p
                            className="text-zinc-500 text-sm"
                        >
                            We&apos;re preparing your PDF.
                        </p>
                    </div>
                </div>
                <ChatInput isDisabled/>
            </div>
        )
    };
    if (data?.status === 'PROCESSING') {
        return (
            <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
                <div className="flex-1 flex justify-center items-center flex-col mb-28">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2  className="h-8 w-8 text-blue-500 animate-spin"/>
                        <h3 className="font-semibold text-xl">Processing PDF...</h3>
                        <p
                            className="text-zinc-500 text-sm"
                        >
                            This won&apos;t take long.
                        </p>
                    </div>
                </div>
                <ChatInput isDisabled/>
            </div>
        );
    };
    // for failed states ( more pages than allowed, or free user uploading more than 4 MB)
    if (data?.status === 'FAILED') {
        return (
            <div className="relative min-h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2">
                <div className="flex-1 flex justify-center items-center flex-col mb-28">
                    <div className="flex flex-col items-center gap-2">
                        <XCircle  className="h-8 w-8 text-red-500 "/>
                        <h3 className="font-semibold text-xl">Too many pages in Pdf</h3>
                        <p
                            className="text-zinc-500 text-sm"
                        >
                            Your <span className="font-medium">Free</span>plan supports up to 5 pages per PDF
                        </p>
                        <Link 
                            href='/dashboard' 
                            className={buttonVariants({
                                variant: 'secondary',
                                className: "mt-4"
                            })}   
                        >
                            <ChevronLeft className="h-3 w-3 mr-1.5" />
                            Back
                        </Link>
                    </div>
                </div>
                <ChatInput isDisabled/>
            </div>
        );
    };

    return (
        <ChatContextProvider
            fileId={fileId}
        >
        <div
            className="relative h-full bg-zinc-50 flex divide-y divide-zinc-200 flex-col justify-between gap-2"
            >
            <div className="flex-1 justify-between flex flex-col mb-28">
                <Messages  fileId={fileId}/>
            </div>

            <ChatInput />
        </div>
        </ChatContextProvider>
    )
}

export default ChatWrapper