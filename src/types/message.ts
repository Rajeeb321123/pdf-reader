// Magic of trpc : vvv imp

import { AppRouter } from "@/trpc";
import { inferRouterOutputs } from "@trpc/server";


// Approuter is collection of entire types of app router throuh trpc ( all the api calls)
type RouterOutput = inferRouterOutputs<AppRouter>;

// api call getFileMessages type
type Messages = RouterOutput["getFileMessages"]["messages"];

// <Messages[number] means only single message
type OmitText = Omit<Messages[number], "text" >

// look we also had loadingmessage Jsx element in combined Message in Messsages.tsx. So we need to accomodate for that
type Extendedtext = {
    text: string | JSX.Element;
};

export type ExtendedMessage = OmitText & Extendedtext