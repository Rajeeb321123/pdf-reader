// validating the request the the api enpoint

import {z} from "zod";

// validator make sure fileId and message is always present in request, otherwise automatically throw error
export const SendMessageValidator = z.object({
    fileId: z.string(),
    message: z.string(),
})