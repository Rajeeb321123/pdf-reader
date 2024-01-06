import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  privateProcedure,
  publicProcedure,
  router,
} from './trpc'
import { TRPCError } from '@trpc/server'
import { db } from '@/db'
import { z } from 'zod'
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'
import { absoluteUrl } from '@/lib/utils'
import { getUserSubscriptionPlan, stripe } from '@/lib/stripe'
import { PLANS } from '@/config/stripe'



export const appRouter = router({

  // VERY IMP:
  // publicProcedure means anyone can call this endpoint
  // privateProcedure means only Authorized user can call the endpoint

  // Authenticate, GEt USER and Create USER in DATABASE if not exist
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession()
    const user = getUser()

    if (!user.id || !user.email)
      throw new TRPCError({ code: 'UNAUTHORIZED' })

    // check if the user is in the database
    const dbUser = await db.user.findFirst({
      where: {
        id: user.id,
      },
    })

    if (!dbUser) {
      // create user in db
      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
        },
      })
    }

    return { success: true }
  }),

  // GET USER FILES
  getUserfiles: privateProcedure.query(async ({ ctx }) => {
    const { userId } = ctx

    return await db.file.findMany({
      where: {
        userId
      }
    });
  }),

  // GET FILE
  // making sure database is synced to uploadthing
  // VV IMP: POLLING CONCEPT , video: 4:33:20
  // right away there will be no file  but after some sec there will be file , so we poll until we get the file
  // checking file exist on database
  // making sure file is in database and we successfully uploaded in uploadthing
  getFile: privateProcedure.input(
    z.object({ key: z.string() })
  ).mutation(async ({ ctx, input }) => {
    const { userId } = ctx;

    const file = await db.file.findFirst({
      where: {
        key: input.key,
        userId,
      },
    });

    if (!file) throw new TRPCError({ code: 'NOT_FOUND' });

    return file;
  }),

  // Delete files
  // zod is type safety in runtime where as typscript for type safety in static
  // zod for validation or type check for incoming data
  deleteFile: privateProcedure.input(
    z.object({
      id: z.string(),

    })
  ).mutation(async ({ ctx, input }) => {
    const { userId } = ctx;

    const file = await db.file.findFirst({
      where: {
        id: input.id,
        userId,
      }
    });

    if (!file) throw new TRPCError({ code: "NOT_FOUND" });

    await db.file.delete({
      where: {
        id: input.id,
      },
    });

    // we dont need to return on delete but, its just a personal taste
    return file;
  }),

  // GET FILE Status
  getFileUploadStatus: privateProcedure.input(
    z.object({ fileId: z.string() })
  ).query(async ({ input, ctx }) => {
    const file = await db.file.findFirst({
      where: {
        id: input.fileId,
        userId: ctx.userId
      },
    })

    // we dont want it any string rather pending . look at enum in schema for why
    if (!file) return { status: "PENDING" as const };

    return { status: file.uploadStatus }
  }),

  // GET FILE ALL MESSAGES 
  // VERY VVimp: we will use infinite queries
  getFileMessages: privateProcedure.input(
    z.object({
      // nullish means we dont have to pass it
      limit: z.number().min(1).max(100).nullish(),
      // we going to load  last 10 message then, for next new 10 message we use cursor to get when we want to older messages
      cursor: z.string().nullish(),
      fileId: z.string(),
    })
  ).query(async ({ ctx, input }) => {
    const { userId } = ctx;
    const { fileId, cursor } = input;
    // if limit not passed we use central cofig limit we created ourself which is just 10.
    const limit = input.limit ?? INFINITE_QUERY_LIMIT;

    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId,
      }
    });

    if (!file) throw new TRPCError({ code: 'NOT_FOUND' });

    // finding the message from file of user
    const messages = await db.message.findMany({
      // VV imp: + 1 is imp beacuse we want to know from where we want fetch next message
      take: limit + 1,
      where: {
        fileId
      },
      // desc is imp here as for cursor , we want latest or last 10 message useing cursor pointing very last message
      orderBy: {
        createdAt: 'desc'
      },
      // from where want to find , cursor is id from where want the message find
      cursor: cursor ? { id: cursor } : undefined,
      // we only these data from select
      select: {
        id: true,
        isUserMessage: true,
        createdAt: true,
        text: true,
      }
    })


    // IMP next cursor
    let nextCursor: typeof cursor | undefined = undefined;

    // remember messages is in desc order so, last message is first element 
    if (messages.length > limit) {
      // removing the  last element messages array . Remember we take + 1 above so +1 is removed and assign it to nextItem
      const nextItem = messages.pop();
      // assigned the nextItem which is removed from messages
      nextCursor = nextItem?.id;
    }

    return {
      messages,
      nextCursor
    };
  }),


  // createStripeSession: privateProcedure.mutation( async ({ctx})=> {
  //   const {userId} = ctx;
    
  //   const billingUrl = absoluteUrl("/dashboard/billing");

  //   if(!userId) throw new TRPCError({code:"UNAUTHORIZED"});

  //   const dbUser = await db.user.findFirst({
  //     where: {
  //       id: userId,
  //     }
  //   });

  //   if (!userId) throw new TRPCError({code:"UNAUTHORIZED"});

  //   // retreive current subscription
  //   const subscriptionPlan = await getUserSubscriptionPlan();

  //   // if user already a customer
  //   if (subscriptionPlan.isSubscribed && dbUser?.stripeCustomerId) {
  //     const stripeSession = await stripe.billingPortal.sessions.create({
  //       customer: dbUser.stripeCustomerId,
  //       return_url: billingUrl
  //     })

  //     return { url: stripeSession.url } ;
  //   }
  //   // if user isnot already a customer
  //   const stripeSession = await stripe.checkout.sessions.create({
  //     success_url: billingUrl,
  //     cancel_url: billingUrl,
  //     payment_method_types: ["card"],
  //     mode: "subscription",
  //     billing_address_collection: "auto",
  //     // what user will pay
  //     line_items:[
  //       {
  //         // we are in test or development phase so .test
  //         price: PLANS.find((plan) => plan.name === 'Pro')?.price.priceIds.test,
  //         quantity: 1
  //       }
  //     ],
  //     // metadata: userId, so it can be sent to webhook to update the correct user
  //     // looka t route.ts of webhook/stripe/route.ts session.metadata.userId
  //     metadata: {
  //       userId: userId,
  //     }
  //   })

  //   return { url: stripeSession.url };

  // }),

  createStripeSession: privateProcedure.mutation(
    async ({ ctx }) => {
      const { userId } = ctx

      const billingUrl = absoluteUrl('/dashboard/billing')

      if (!userId)
        throw new TRPCError({ code: 'UNAUTHORIZED' })

      const dbUser = await db.user.findFirst({
        where: {
          id: userId,
        },
      })

      if (!dbUser)
        throw new TRPCError({ code: 'UNAUTHORIZED' })

      const subscriptionPlan =
        await getUserSubscriptionPlan()

      if (
        subscriptionPlan.isSubscribed &&
        dbUser.stripeCustomerId
      ) {
        const stripeSession =
          await stripe.billingPortal.sessions.create({
            customer: dbUser.stripeCustomerId,
            return_url: billingUrl,
          })

        return { url: stripeSession.url }
      }

      const stripeSession =
        await stripe.checkout.sessions.create({
          success_url: billingUrl,
          cancel_url: billingUrl,
          payment_method_types: ['card'],
          mode: 'subscription',
          billing_address_collection: 'auto',
          line_items: [
            {
              price: PLANS.find(
                (plan) => plan.name === 'Pro'
              )?.price.priceIds.test,
              quantity: 1,
            },
          ],
          metadata: {
            userId: userId,
          },
        })

      return { url: stripeSession.url }
    }
  ),



})

export type AppRouter = typeof appRouter