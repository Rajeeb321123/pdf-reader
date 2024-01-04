import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { TRPCError, initTRPC } from '@trpc/server';
 
/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.create();

// middle for private procedure so we only Authorized as per our logic users can access the endpoint
const middleware = t.middleware;
const isAuth = middleware(async(opts) =>{
    const {getUser} = getKindeServerSession();
    const user = getUser();

    if(!user || !user.id){
        throw new TRPCError({ code: "UNAUTHORIZED"})
    };

    // .next() means next action will be taken eg the main function or another middleware (we didnt have another middleware here)
    return opts.next({
        // ctx mean context. we cam pass this from middleware to main called function 
        ctx:{
            // we passed user and user.id so typescript know user and user.id are string
            userId: user.id,
            user,
        }
    });
})
 
/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
// public procedure allows us to create a public end point( no auth needed)
export const publicProcedure = t.procedure;
// private procedure
export const privateProcedure = t.procedure.use(isAuth);