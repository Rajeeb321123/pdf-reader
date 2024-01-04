

import { trpc } from "@/app/_trpc/client"
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { Loader2, MessageSquare } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import Message from "./Message";
import { ChatContext } from "./ChatContext";
import { useContext, useEffect, useRef } from "react";
import { useIntersection } from "@mantine/hooks";

interface MessageProps {
  fileId: string;
}

export default function Messages({ fileId }: MessageProps) {

  const { isLoading: isAiThinking } = useContext(ChatContext);

  // useInfinteQuery is trpc function
  const { data, isLoading, fetchNextPage } = trpc.getFileMessages.useInfiniteQuery(
    // for getFileMessages
    {
      fileId,
      limit: INFINITE_QUERY_LIMIT
    },
    // second config option for useInfinteQuery()
    {
      // lastPage is retrun from getFileMessages
      getNextPageParam: (lastpage) => lastpage?.nextCursor,
      // while fetching keeping prev data alive, by default it is false
      keepPreviousData: true
    }
  );



  const loadingMessage = {
    createdAt: new Date().toISOString(),
    id: 'loading-message',
    isUserMessage: false,
    text: (
      <span
        className="flex h-full items-center justify-center"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    )
  }

  // extract just  message from data, we dont next next cursor here
  // flat map: if we use map we get [][]  but we want messages{}[] , se we use flat map instead of doubling map twice
  const messages = data?.pages.flatMap((page) => page.messages);

  // IMP: combined message concept
  const combinedMessages = [
    ...(isAiThinking ? [loadingMessage] : []),
    ...(messages ?? []),
  ];

  // VV IMP: inifinte queries
  // for knowing top or last of 10 message intersected at top so new 10 message can be loaded
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const {ref, entry} = useIntersection({
    root: lastMessageRef.current,
    threshold:1
  });

  // IMP: entry is intersecting load new messages
  useEffect(()=> {
    if (entry?.isIntersecting) {
      fetchNextPage();
    }
  },[entry,fetchNextPage])


  return (
    <div
    className='flex max-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'
    >
      {combinedMessages && combinedMessages.length > 0 ? (

        combinedMessages.map((message, i) => {

          // ege case for css message of ai and user : IMP: if 2 message from same person simulateously
          const isNextMessageSamePerson = combinedMessages[i - 1]?.isUserMessage

          // for last or top message of 10 message: only one message. for infinte queries using ref of intersection
          if (i === combinedMessages.length - 1) {
            return (
              <Message
                key={message.id}
                isNextMessageSamePerson={isNextMessageSamePerson}
                message={message}
                // pass ref from useIntersection
                ref={ref}
              />
            )
          }
          // for other 9 message
          else return (
            <Message
              key={message.id}
              isNextMessageSamePerson={isNextMessageSamePerson}
              message={message}
            />
          )
        })

      ) : isLoading ? (
        <div
          className="w-full flex flex-col gap-2"
        >
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ) : (
        <div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <MessageSquare className="h-8 w-8 text-blue-500" />
            <h3
              className="font-semibold text-xl"
            >
              You&apos;re all set
            </h3>
            <p
              className=" text-zinc-500 text-sm"
            >
              Ask your first question to get started
            </p>
          </div>
        </div>)
      }
    </div>
  )
}
